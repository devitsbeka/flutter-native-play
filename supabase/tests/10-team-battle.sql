-- Team Battle, executed rather than reviewed (docs/GAME_TYPES_DESIGN.md §2).
--
-- The whole match is decided in SECURITY DEFINER plpgsql — rotation, prices,
-- scoring, the tie-breaker, the payout — and none of it had been executed
-- until this suite. Two full 1v1 matches run here through the public RPCs
-- only: one decided on the board, one tied into the super round. Along the
-- way, every refusal that keeps the match honest is asserted: outsiders and
-- the wrong player at every phase, client-named prices ignored, out-of-order
-- answers, double answers, double settlement.
--
-- Same harness as the other suites (see README.md): the shim's auth.uid()
-- reads test.uid, superuser statements are the fixture/inspection channel.

\set ON_ERROR_STOP on
\pset pager off

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE raised boolean := false;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN raised := true;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'ASSERTION FAILED (should have been refused): %', label;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, wanted %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

-- A board tile with n questions whose correct answers are '<prefix>-c<i>'.
-- The 9999 price is bait: the server must ignore it and price by difficulty.
CREATE OR REPLACE FUNCTION pg_temp.mk_tile(prefix text, diff text, n integer)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'category_name', prefix,
    'difficulty', diff,
    'price', 9999,
    'questions', (
      SELECT jsonb_agg(jsonb_build_object(
        'question_text', prefix || '-q' || i,
        'correct_answer', prefix || '-c' || i,
        'shuffled_answers', jsonb_build_array(prefix || '-c' || i, 'w1', 'w2', 'w3')))
      FROM generate_series(0, n - 1) i));
$$;

CREATE OR REPLACE FUNCTION pg_temp.mk_super(n integer)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_agg(jsonb_build_object(
    'question_text', 'super-q' || i,
    'correct_answer', 'super-c' || i,
    'shuffled_answers', jsonb_build_array('super-c' || i, 'w1', 'w2', 'w3')))
  FROM generate_series(0, n - 1) i;
$$;

-- ── privilege posture ──────────────────────────────────────────────────────

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('tb_start_match', 'tb_submit_rps', 'tb_pick_tile',
                       'tb_submit_answer', 'tb_vote_super', 'tb_submit_super',
                       'tb_advance', 'tb_settle')
     AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'anon can call: % -- revoke FROM PUBLIC, anon', bad;
  END IF;
  RAISE NOTICE 'ok: no team battle RPC is reachable by anon';
END $$;

DO $$
DECLARE bad text;
BEGIN
  -- The internal helpers move scores and money; nobody callable.
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('tb_next_player', 'tb_team_throw', 'tb_resolve_rps',
                       'tb_close_turn', 'tb_resolve_super_vote', 'tb_advance_super')
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'internal helper callable by a client role: %', bad;
  END IF;
  RAISE NOTICE 'ok: internal helpers are not callable by client roles';
END $$;

DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('team_battle_board', 'team_battle_state')
     AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  PERFORM pg_temp.must_equal(n, 0::bigint, 'no client write policies on team battle tables');
END $$;

-- ── match 1: decided on the board ──────────────────────────────────────────

DO $$
DECLARE
  v_alice uuid := 'ab000000-0000-0000-0000-00000000000a';
  v_bob   uuid := 'ab000000-0000-0000-0000-00000000000b';
  v_out   uuid := 'ab000000-0000-0000-0000-00000000000c';
  v_room uuid;
  v_game uuid;
  v_board jsonb;
  v_state public.team_battle_state%ROWTYPE;
  v_tile uuid;
  v_alice_coins_before integer;
  v_bob_coins_before integer;
  v_settle jsonb;
  v_bot_a uuid;
  v_bot_b uuid;
  v_iter integer;
  v_is_bot boolean;
  i integer;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_alice, 'alice@tb.test'),
    (v_bob,   'bob@tb.test'),
    (v_out,   'out@tb.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
    (v_alice, 'alice', 1000, 0),
    (v_bob,   'bob',   1000, 0),
    (v_out,   'out',   1000, 0)
  ON CONFLICT (user_id) DO UPDATE SET coins = 1000, gems = 0;
  DELETE FROM public.currency_grants WHERE user_id IN (v_alice, v_bob, v_out);

  INSERT INTO public.game_rooms (room_code, host_user_id, status, game_type_key)
  VALUES ('TBTST1', v_alice, 'waiting', 'team_battle') RETURNING id INTO v_room;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, team)
  VALUES (v_room, v_alice, 'alice', true,  'joined', 'a'),
         (v_room, v_bob,   'bob',   false, 'joined', 'b');

  v_board := jsonb_build_object(
    'tiles', jsonb_build_array(
      pg_temp.mk_tile('t0', 'easy', 5),
      pg_temp.mk_tile('t1', 'easy', 5),
      pg_temp.mk_tile('t2', 'hard', 5),
      pg_temp.mk_tile('t3', 'hard', 5)),
    'super_questions', pg_temp.mk_super(5));

  -- Refusals before anything starts.
  PERFORM pg_temp.as_user(v_bob);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_start_match(%L, %L::jsonb)', v_room, v_board::text),
    'non-host cannot start the match');

  PERFORM pg_temp.as_user(NULL);
  UPDATE public.room_participants SET team = NULL WHERE room_id = v_room AND user_id = v_bob;
  PERFORM pg_temp.as_user(v_alice);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_start_match(%L, %L::jsonb)', v_room, v_board::text),
    'a teamless player blocks the start');

  PERFORM pg_temp.as_user(NULL);
  UPDATE public.room_participants SET team = 'a' WHERE room_id = v_room AND user_id = v_bob;
  PERFORM pg_temp.as_user(v_alice);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_start_match(%L, %L::jsonb)', v_room, v_board::text),
    'unequal teams are refused');

  PERFORM pg_temp.as_user(NULL);
  UPDATE public.room_participants SET team = 'b' WHERE room_id = v_room AND user_id = v_bob;

  PERFORM pg_temp.as_user(v_alice);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_start_match(%L, %L::jsonb)', v_room,
           jsonb_build_object('tiles', jsonb_build_array(
             pg_temp.mk_tile('x0', 'easy', 5), pg_temp.mk_tile('x1', 'easy', 5),
             pg_temp.mk_tile('x2', 'easy', 5)),
             'super_questions', pg_temp.mk_super(5))::text),
    'an odd board is refused');
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_start_match(%L, %L::jsonb)', v_room,
           jsonb_build_object('tiles', v_board -> 'tiles')::text),
    'a board without super questions is refused');

  -- The dark launch holds at the start RPC, not just in the chooser.
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_start_match(%L, %L::jsonb)', v_room, v_board::text),
    'a non-live mode starts no matches');
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.game_types SET is_live = true WHERE key = 'team_battle';
  PERFORM pg_temp.as_user(v_alice);

  -- Start for real.
  v_game := public.tb_start_match(v_room, v_board);

  -- Someone who walks in mid-match is a spectator: their throws are refused
  -- and (asserted implicitly by every rotation check below) they never
  -- become the spotlight player.
  PERFORM pg_temp.as_user(NULL);
  INSERT INTO auth.users (id, email) VALUES (v_out, 'out@tb.test') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, team)
  VALUES (v_room, v_out, 'interloper', false, 'joined', 'a');
  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_submit_rps(%L, %L)', v_room, 'rock'),
    'a mid-match joiner cannot throw');
  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.room_participants WHERE room_id = v_room AND user_id = v_out;

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'rps', 'match opens with rock-paper-scissors');
  PERFORM pg_temp.must_equal(
    (SELECT status::text FROM public.game_rooms WHERE id = v_room), 'playing',
    'room is playing once the match starts');
  PERFORM pg_temp.must_equal(
    (SELECT price FROM public.team_battle_board WHERE game_id = v_game AND tile_index = 0),
    100, 'easy tiles are priced by the server, not the client');
  PERFORM pg_temp.must_equal(
    (SELECT price FROM public.team_battle_board WHERE game_id = v_game AND tile_index = 2),
    400, 'hard tiles are priced by the server, not the client');

  -- RPS: outsiders refused; rock beats scissors so team a opens.
  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_submit_rps(%L, %L)', v_room, 'rock'),
    'an outsider cannot throw');
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_submit_rps(v_room, 'rock');
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_submit_rps(v_room, 'scissors');

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'board', 'last throw resolves the opener');
  PERFORM pg_temp.must_equal(v_state.active_team, 'a', 'rock beats scissors');
  PERFORM pg_temp.must_equal(v_state.active_player, v_alice, 'the winning team picks first');

  -- Turn 1 (alice, t0 easy): the wrong player cannot pick, questions must be
  -- answered in order, and 5/5 correct earns exactly the tile price.
  SELECT id INTO v_tile FROM public.team_battle_board WHERE game_id = v_game AND tile_index = 0;
  PERFORM pg_temp.as_user(v_bob);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_pick_tile(%L, %L)', v_room, v_tile),
    'only the spotlight player picks');
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_pick_tile(v_room, v_tile);

  PERFORM pg_temp.as_user(v_bob);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_submit_answer(%L, 0, %L)', v_room, 't0-c0'),
    'only the spotlight player answers');
  PERFORM pg_temp.as_user(v_alice);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_submit_answer(%L, 3, %L)', v_room, 't0-c3'),
    'answers out of order are refused');
  FOR i IN 0..4 LOOP
    PERFORM public.tb_submit_answer(v_room, i, 't0-c' || i);
  END LOOP;
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_submit_answer(%L, 5, %L)', v_room, 'anything'),
    'a tile out of material takes no more answers');

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.team_a_score, 100, '5/5 on an easy tile pays its full price');

  PERFORM public.tb_advance(v_room);
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'board', 'exhausted material closes the turn');
  PERFORM pg_temp.must_equal(v_state.active_team, 'b', 'the board alternates teams');
  PERFORM pg_temp.must_equal(v_state.active_player, v_bob, 'rotation hands bob the spotlight');
  PERFORM pg_temp.must_equal(
    (SELECT claimed_by_team FROM public.team_battle_board WHERE id = v_tile), 'a',
    'the played tile is claimed');

  -- Turn 2 (bob, t2 hard): 2/5 correct is two 80-point slices.
  SELECT id INTO v_tile FROM public.team_battle_board WHERE game_id = v_game AND tile_index = 2;
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_pick_tile(v_room, v_tile);
  PERFORM public.tb_submit_answer(v_room, 0, 't2-c0');
  PERFORM public.tb_submit_answer(v_room, 1, 't2-c1');
  PERFORM public.tb_submit_answer(v_room, 2, 'wrong');
  PERFORM public.tb_submit_answer(v_room, 3, 'wrong');
  PERFORM public.tb_submit_answer(v_room, 4, 'wrong');
  PERFORM public.tb_advance(v_room);

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.team_b_score, 160, 'hard-tile slices are 80 points');
  PERFORM pg_temp.must_equal(v_state.active_player, v_alice, 'back to team a');

  -- Turn 3 (alice, t1 easy, 5/5) and turn 4 (bob, t3 hard, 0/5).
  SELECT id INTO v_tile FROM public.team_battle_board WHERE game_id = v_game AND tile_index = 1;
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_pick_tile(v_room, v_tile);
  FOR i IN 0..4 LOOP
    PERFORM public.tb_submit_answer(v_room, i, 't1-c' || i);
  END LOOP;
  PERFORM public.tb_advance(v_room);

  SELECT id INTO v_tile FROM public.team_battle_board WHERE game_id = v_game AND tile_index = 3;
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_pick_tile(v_room, v_tile);
  FOR i IN 0..4 LOOP
    PERFORM public.tb_submit_answer(v_room, i, 'wrong');
  END LOOP;
  PERFORM public.tb_advance(v_room);

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'done', 'an exhausted board with a lead ends the match');
  PERFORM pg_temp.must_equal(v_state.winner_team, 'a', 'the higher score wins');
  PERFORM pg_temp.must_equal(v_state.team_a_score, 200, 'final score for a');
  PERFORM pg_temp.must_equal(v_state.team_b_score, 160, 'final score for b');

  -- Settlement: once, by anyone in the room; winners take 50/round + the
  -- 50 participation coins, losers participation only (20260921130000).
  SELECT coins INTO v_alice_coins_before FROM public.profiles WHERE user_id = v_alice;
  SELECT coins INTO v_bob_coins_before FROM public.profiles WHERE user_id = v_bob;

  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_settle(%L)', v_room),
    'an outsider cannot settle');

  PERFORM pg_temp.as_user(v_bob);
  v_settle := public.tb_settle(v_room);
  PERFORM pg_temp.must_equal((v_settle ->> 'applied')::boolean, true, 'first settle applies');

  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_alice),
    v_alice_coins_before + 50
      + 50 * (SELECT count(*)::int FROM public.team_battle_board WHERE game_id = v_game),
    'a winner is paid 50/round + participation');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_bob),
    v_bob_coins_before + 50, 'a loser is paid participation only');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.currency_grants
      WHERE user_id IN (v_alice, v_bob)
        AND kind IN ('team_battle_win', 'team_battle_play')),
    3, 'every payout has a ledger row');

  PERFORM pg_temp.as_user(v_alice);
  v_settle := public.tb_settle(v_room);
  PERFORM pg_temp.must_equal((v_settle ->> 'applied')::boolean, false, 'second settle is a no-op');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_alice),
    v_alice_coins_before + 50
      + 50 * (SELECT count(*)::int FROM public.team_battle_board WHERE game_id = v_game),
    'a repeat settle pays nothing more');

  PERFORM pg_temp.must_equal(
    (SELECT status::text FROM public.game_rooms WHERE id = v_room), 'waiting',
    'the room is back to waiting for a rematch');
  PERFORM pg_temp.must_equal(
    (SELECT total_wins FROM public.room_participants
      WHERE room_id = v_room AND user_id = v_alice),
    1, 'cumulative totals accumulate for the winning side');

  -- ── match 2: a tie, into the super round ─────────────────────────────────

  v_board := jsonb_build_object(
    'tiles', jsonb_build_array(
      pg_temp.mk_tile('u0', 'easy', 5),
      pg_temp.mk_tile('u1', 'easy', 5)),
    'super_questions', pg_temp.mk_super(5));

  PERFORM pg_temp.as_user(v_alice);
  v_game := public.tb_start_match(v_room, v_board);

  PERFORM public.tb_submit_rps(v_room, 'paper');
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_submit_rps(v_room, 'paper');
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'board', 'a gesture tie still resolves the opener');

  -- First turn: nobody picks. The board deadline expires (moved into the
  -- past by the fixture) and tb_advance auto-picks a tile instead of stalling.
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.team_battle_state SET deadline = now() - interval '1 minute'
   WHERE room_id = v_room;
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_advance(v_room);
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'rapid_fire', 'a pick that never came is auto-picked');

  -- Both turns are perfect runs, whoever the opener chose to go first.
  FOR i IN 0..4 LOOP
    PERFORM pg_temp.as_user(v_state.active_player);
    PERFORM public.tb_submit_answer(v_room, i,
      (SELECT questions -> i ->> 'correct_answer'
         FROM public.team_battle_board WHERE id = v_state.active_tile));
  END LOOP;
  PERFORM public.tb_advance(v_room);

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'board', 'one tile left, board again');
  PERFORM pg_temp.as_user(v_state.active_player);
  PERFORM public.tb_pick_tile(v_room,
    (SELECT id FROM public.team_battle_board
      WHERE game_id = v_game AND claimed_by_team IS NULL));
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  FOR i IN 0..4 LOOP
    PERFORM public.tb_submit_answer(v_room, i,
      (SELECT questions -> i ->> 'correct_answer'
         FROM public.team_battle_board WHERE id = v_state.active_tile));
  END LOOP;
  PERFORM public.tb_advance(v_room);

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'super_vote', 'a points tie goes to the vote');

  -- Champions: each side votes for itself. A cross-team vote is refused.
  PERFORM pg_temp.as_user(v_alice);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_vote_super(%L, %L)', v_room, v_bob),
    'a champion vote cannot cross teams');
  PERFORM public.tb_vote_super(v_room, v_alice);
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_vote_super(v_room, v_bob);

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'super_round', 'all votes in starts the blitz');
  PERFORM pg_temp.must_equal(v_state.super ->> 'champion_a', v_alice::text, 'team a champion');
  PERFORM pg_temp.must_equal(v_state.super ->> 'champion_b', v_bob::text, 'team b champion');

  -- q0: alice first and correct — a point and the next question.
  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_submit_super(%L, 0, %L)', v_room, 'super-c0'),
    'only champions play the super round');
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_submit_super(v_room, 0, 'super-c0');
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_submit_super(%L, 0, %L)', v_room, 'super-c0'),
    'a decided question is no longer live');

  -- q1: both wrong — nobody scores, a second try is refused, the round moves.
  PERFORM public.tb_submit_super(v_room, 1, 'wrong');
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_submit_super(%L, 1, %L)', v_room, 'super-c1'),
    'one shot per champion per question');
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_submit_super(v_room, 1, 'also wrong');

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal((v_state.super ->> 'question_index')::int, 2,
    'two burned shots move the round on');

  -- q2 to bob, q3 and q4 to alice: 3-1, match over, alice's team wins.
  PERFORM public.tb_submit_super(v_room, 2, 'super-c2');
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_submit_super(v_room, 3, 'super-c3');
  PERFORM public.tb_submit_super(v_room, 4, 'super-c4');

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'done', 'the blitz ends the match');
  PERFORM pg_temp.must_equal(v_state.winner_team, 'a', 'the super round decides the winner');

  PERFORM pg_temp.as_user(v_bob);
  v_settle := public.tb_settle(v_room);
  PERFORM pg_temp.must_equal((v_settle ->> 'applied')::boolean, true,
    'a rematch settles under its own game id');

  -- ── match 3: bots fill the empty seats ───────────────────────────────────
  -- 2 humans + 2 bots, 2v2. The humans throw, pick and answer; the bots'
  -- turns are played entirely by tb_advance. Whatever the dice do, the match
  -- must converge — through the super round if the bots tie it up.

  PERFORM pg_temp.as_user(v_bob);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_add_bot(%L, %L)', v_room, 'a'),
    'only the host adds bots');
  PERFORM pg_temp.as_user(v_alice);
  v_bot_a := public.tb_add_bot(v_room, 'a');
  v_bot_b := public.tb_add_bot(v_room, 'b');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants
      WHERE room_id = v_room AND is_bot), 2,
    'two bots seated');

  v_board := jsonb_build_object(
    'tiles', jsonb_build_array(
      pg_temp.mk_tile('w0', 'easy', 5), pg_temp.mk_tile('w1', 'easy', 5),
      pg_temp.mk_tile('w2', 'easy', 5), pg_temp.mk_tile('w3', 'easy', 5)),
    'super_questions', pg_temp.mk_super(5));
  v_game := public.tb_start_match(v_room, v_board);

  PERFORM public.tb_submit_rps(v_room, 'rock');
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_submit_rps(v_room, 'scissors');
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'board',
    'the opener resolves on the human throws alone');

  v_iter := 0;
  LOOP
    v_iter := v_iter + 1;
    IF v_iter > 40 THEN
      RAISE EXCEPTION 'bot match did not converge (stuck in %)', v_state.phase;
    END IF;
    SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
    EXIT WHEN v_state.phase = 'done';

    SELECT COALESCE(is_bot, false) INTO v_is_bot
      FROM public.room_participants
     WHERE room_id = v_room AND user_id = v_state.active_player;

    IF v_state.phase = 'board' THEN
      IF v_is_bot THEN
        PERFORM pg_temp.as_user(v_alice);
        PERFORM public.tb_advance(v_room);  -- the server plays the bot's turn
      ELSE
        PERFORM pg_temp.as_user(v_state.active_player);
        PERFORM public.tb_pick_tile(v_room,
          (SELECT id FROM public.team_battle_board
            WHERE game_id = v_game AND claimed_by_team IS NULL
            ORDER BY tile_index LIMIT 1));
      END IF;
    ELSIF v_state.phase = 'rapid_fire' THEN
      IF v_is_bot THEN
        PERFORM pg_temp.as_user(NULL);
        UPDATE public.team_battle_state SET deadline = now() - interval '1 second'
         WHERE room_id = v_room;
        PERFORM pg_temp.as_user(v_alice);
        PERFORM public.tb_advance(v_room);
      ELSE
        PERFORM pg_temp.as_user(v_state.active_player);
        FOR i IN v_state.turn_answers..4 LOOP
          PERFORM public.tb_submit_answer(v_room, i,
            (SELECT questions -> i ->> 'correct_answer'
               FROM public.team_battle_board WHERE id = v_state.active_tile));
        END LOOP;
        PERFORM public.tb_advance(v_room);
      END IF;
    ELSIF v_state.phase = 'super_vote' THEN
      PERFORM pg_temp.as_user(v_alice);
      PERFORM public.tb_vote_super(v_room, v_alice);
      PERFORM pg_temp.as_user(v_bob);
      PERFORM public.tb_vote_super(v_room, v_bob);
    ELSIF v_state.phase = 'super_round' THEN
      PERFORM pg_temp.must_equal(v_state.super ->> 'champion_a', v_alice::text,
        'a human champions the team, never the bot');
      PERFORM pg_temp.as_user(v_alice);
      PERFORM public.tb_submit_super(v_room,
        COALESCE((v_state.super ->> 'question_index')::int, 0),
        v_state.super -> 'questions'
          -> COALESCE((v_state.super ->> 'question_index')::int, 0) ->> 'correct_answer');
    END IF;
  END LOOP;

  PERFORM pg_temp.as_user(v_alice);
  v_settle := public.tb_settle(v_room);
  PERFORM pg_temp.must_equal((v_settle ->> 'applied')::boolean, true, 'the bot match settles');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.currency_grants
      WHERE user_id IN (v_bot_a, v_bot_b)), 0,
    'bots are never paid');

  PERFORM public.tb_remove_bot(v_room, v_bot_a);
  PERFORM public.tb_remove_bot(v_room, v_bot_b);
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants WHERE room_id = v_room), 2,
    'bots can be cleared out after the match');

  -- ── captains (20260921100000): host-named, outrank votes, never a bot ────

  PERFORM pg_temp.as_user(v_bob);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_set_captain(%L, %L)', v_room, v_bob),
    'only the host names captains');

  -- Third human on team a, and a bot back on each side, to make the
  -- champion ordering observable: humans > captaincy > votes.
  PERFORM pg_temp.as_user(NULL);
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, team, is_bot)
  VALUES (v_room, v_out, 'Trace', false, 'playing', 'a', false);
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_add_bot(v_room, 'a');
  PERFORM public.tb_add_bot(v_room, 'b');

  PERFORM public.tb_set_captain(v_room, v_alice);
  PERFORM pg_temp.must_equal(
    (SELECT is_captain FROM public.room_participants WHERE room_id = v_room AND user_id = v_alice),
    true, 'the host can captain a teammate');
  PERFORM public.tb_set_captain(v_room, v_out);
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants
      WHERE room_id = v_room AND team = 'a' AND is_captain), 1,
    'a team has exactly one captain — naming a new one clears the old');

  -- Resolve with every vote against the captain: the captain still champions.
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.team_battle_state
     SET phase = 'super_vote', deadline = now() - interval '1 second',
         super = jsonb_build_object('questions', COALESCE(super -> 'questions', '[]'::jsonb),
                                    'votes', jsonb_build_object('x', v_alice::text))
   WHERE room_id = v_room;
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM public.tb_resolve_super_vote(v_state);
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.super ->> 'champion_a', v_out::text,
    'the named captain outranks the vote tally');
  PERFORM pg_temp.must_equal(v_state.super ->> 'champion_b', v_bob::text,
    'a captainless team falls back to the human vote order');

  -- A captained bot still never outranks a human teammate.
  SELECT user_id INTO v_bot_a FROM public.room_participants
   WHERE room_id = v_room AND team = 'a' AND is_bot LIMIT 1;
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_set_captain(v_room, v_bot_a);
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.team_battle_state
     SET phase = 'super_vote', deadline = now() - interval '1 second',
         super = jsonb_build_object('questions', COALESCE(super -> 'questions', '[]'::jsonb),
                                    'votes', '{}'::jsonb)
   WHERE room_id = v_room;
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM public.tb_resolve_super_vote(v_state);
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(
    (SELECT is_bot FROM public.room_participants
      WHERE room_id = v_room AND user_id = (v_state.super ->> 'champion_a')::uuid),
    false, 'a captained bot never champions over a human');

  -- ── the pot scales with the board (20260921130000) ───────────────────────

  PERFORM pg_temp.must_equal(
    (SELECT bool_and(cg.coins = LEAST(600, 50 * (
        SELECT count(*) FROM public.team_battle_board b
         WHERE b.game_id::text = split_part(cg.reference, ':', 2))))
       FROM public.currency_grants cg
      WHERE cg.kind = 'team_battle_win' AND cg.user_id IN (v_alice, v_bob)),
    true, 'every win payout is 50 coins per round of its board');

  -- ── seat management (20260921120000): host-only, lobby-only ────────────

  PERFORM pg_temp.as_user(v_bob);
  PERFORM pg_temp.must_fail(
    format('SELECT public.lobby_manage_seat(%L, %L, %L)', v_room, v_out, 'remove'),
    'only the host manages seats');

  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.lobby_manage_seat(v_room, v_bob, 'move_a');
  PERFORM pg_temp.must_equal(
    (SELECT team FROM public.room_participants WHERE room_id = v_room AND user_id = v_bob),
    'a', 'the host can move a player between teams');
  PERFORM public.lobby_manage_seat(v_room, v_bob, 'move_b');
  PERFORM public.lobby_manage_seat(v_room, v_out, 'remove');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants
      WHERE room_id = v_room AND user_id = v_out), 0,
    'the host can remove a seat');
  PERFORM pg_temp.must_fail(
    format('SELECT public.lobby_manage_seat(%L, %L, %L)', v_room, v_alice, 'remove'),
    'the host cannot remove their own seat');

  -- Cleanup so reruns start clean — the mode goes back to dark.
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.game_types SET is_live = false WHERE key = 'team_battle';
  DELETE FROM public.room_match_history WHERE room_id = v_room;
  DELETE FROM public.game_rooms WHERE id = v_room;
  DELETE FROM public.currency_grants WHERE user_id IN (v_alice, v_bob, v_out);
END $$;

\echo 'ok: team battle plays, ties, and pays by the rules'
