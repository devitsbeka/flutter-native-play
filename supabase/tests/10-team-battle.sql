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
  -- A winner takes a flat 200, a loser nothing (20260930120000).
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
    v_alice_coins_before + 200, 'a winner is paid a flat 200');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_bob),
    v_bob_coins_before, 'a loser is paid nothing');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.currency_grants
      WHERE user_id IN (v_alice, v_bob)
        AND kind IN ('team_battle_win', 'team_battle_play')),
    1, 'only the winner has a ledger row');

  PERFORM pg_temp.as_user(v_alice);
  v_settle := public.tb_settle(v_room);
  PERFORM pg_temp.must_equal((v_settle ->> 'applied')::boolean, false, 'second settle is a no-op');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_alice),
    v_alice_coins_before + 200, 'a repeat settle pays nothing more');

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

  -- A tie replays the opener (20260921190000): the hand is revealed, the
  -- throws reset, and the second hand decides.
  PERFORM public.tb_submit_rps(v_room, 'paper');
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_submit_rps(v_room, 'paper');
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'rps', 'a gesture tie replays the opener');
  PERFORM pg_temp.must_equal((v_state.rps -> 'last' ->> 'tie')::boolean, true,
    'the tied hand is recorded for the reveal');
  PERFORM pg_temp.must_equal(v_state.rps -> 'throws', '{}'::jsonb, 'the rethrow starts clean');
  PERFORM pg_temp.must_equal((v_state.rps ->> 'round')::int, 1, 'the round counter moves');

  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_submit_rps(v_room, 'rock');
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_submit_rps(v_room, 'scissors');
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'board', 'the second hand resolves the opener');
  PERFORM pg_temp.must_equal(v_state.rps -> 'last' ->> 'winner', 'a',
    'the reveal names the winner');

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
  -- 20260921140000: bots wear ordinary one-word names, not robo-prefixes.
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants
      WHERE room_id = v_room AND is_bot AND nickname LIKE '% %'), 0,
    'bot names are one word');

  v_board := jsonb_build_object(
    'tiles', jsonb_build_array(
      pg_temp.mk_tile('w0', 'easy', 5), pg_temp.mk_tile('w1', 'easy', 5),
      pg_temp.mk_tile('w2', 'easy', 5), pg_temp.mk_tile('w3', 'easy', 5)),
    'super_questions', pg_temp.mk_super(5));
  v_game := public.tb_start_match(v_room, v_board);

  -- 20260921210000: the opener is the captains' duel — the two captains'
  -- gestures ARE the team gestures, bots and teammates alike stay out of
  -- it. Rock vs scissors must therefore resolve on the very first hand.
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_submit_rps(v_room, 'rock');
  PERFORM pg_temp.as_user(v_bob);
  PERFORM public.tb_submit_rps(v_room, 'scissors');
  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'board',
    'the opener resolves on the captains'' throws alone');
  PERFORM pg_temp.must_equal(v_state.rps ->> 'winner', 'a',
    'rock beats scissors even with a bot on each team');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants
      WHERE room_id = v_room AND status = 'playing' AND is_captain), 2,
    'the start crowned a captain per team');

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

  -- ── captain voting (20260921150000): the team elects, plurality leads ────

  PERFORM pg_temp.as_user(v_bob);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_vote_captain(%L, %L)', v_room, v_alice),
    'votes stay inside the voter''s own team');
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_vote_captain(%L, %L)', v_room,
      (SELECT user_id FROM public.room_participants
        WHERE room_id = v_room AND team = 'b' AND is_bot LIMIT 1)),
    'a bot cannot wear the armband by vote');

  -- Alice backs Trace: one vote to none takes the armband (and strips the
  -- bot the host had just named).
  PERFORM pg_temp.as_user(v_alice);
  PERFORM public.tb_vote_captain(v_room, v_out);
  PERFORM pg_temp.must_equal(
    (SELECT is_captain FROM public.room_participants WHERE room_id = v_room AND user_id = v_out),
    true, 'the plurality leader wears the armband');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants
      WHERE room_id = v_room AND team = 'a' AND is_captain), 1,
    'voting keeps exactly one captain on the team');

  -- Trace votes Alice back: a 1-1 tie goes to the earliest joiner.
  PERFORM pg_temp.as_user(v_out);
  PERFORM public.tb_vote_captain(v_room, v_alice);
  PERFORM pg_temp.must_equal(
    (SELECT is_captain FROM public.room_participants WHERE room_id = v_room AND user_id = v_alice),
    true, 'a tie hands the armband to the earliest joiner');

  -- Alice cannot hand it to herself (20261002100000). The sheet has never
  -- offered your own row; now the server agrees, so a call made past the UI
  -- is refused too.
  PERFORM pg_temp.as_user(v_alice);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_vote_captain(%L, %L)', v_room, v_alice),
    'nobody votes for themselves');
  PERFORM pg_temp.must_equal(
    (SELECT captain_vote FROM public.room_participants
      WHERE room_id = v_room AND user_id = v_alice),
    v_out, 'a refused self-vote leaves the vote already cast alone');
  PERFORM pg_temp.must_equal(
    (SELECT is_captain FROM public.room_participants WHERE room_id = v_room AND user_id = v_alice),
    true, 'and the tie-break armband stays where it was');

  -- ── the pot is a flat 200 a head (20260930120000) ────────────────────────

  PERFORM pg_temp.must_equal(
    (SELECT bool_and(cg.coins = 200)
       FROM public.currency_grants cg
      WHERE cg.kind = 'team_battle_win' AND cg.user_id IN (v_alice, v_bob)),
    true, 'every win payout is a flat 200');

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

-- ── a 3-3 arena electing its captains ─────────────────────────────────────
--
-- The armband is voted from three a side up (below that the host's device
-- rolls one), and the lobby now opens a ten-second window for it. The window
-- is the client's; WHO WINS is this function's, and that is what is executed
-- here: plurality inside one bench, the other bench untouched, a changed
-- vote re-tallying, ties going to the earliest joiner, and every caller who
-- should not be voting refused.

CREATE OR REPLACE FUNCTION pg_temp.captain_of(p_room uuid, p_team text)
RETURNS text LANGUAGE sql AS $$
  SELECT nickname FROM public.room_participants
   WHERE room_id = p_room AND team = p_team AND is_captain LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION pg_temp.captain_count(p_room uuid, p_team text)
RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) FROM public.room_participants
   WHERE room_id = p_room AND team = p_team AND is_captain;
$$;

DO $$
DECLARE
  a1 uuid := 'cc000000-0000-0000-0000-0000000000a1';
  a2 uuid := 'cc000000-0000-0000-0000-0000000000a2';
  a3 uuid := 'cc000000-0000-0000-0000-0000000000a3';
  b1 uuid := 'cc000000-0000-0000-0000-0000000000b1';
  b2 uuid := 'cc000000-0000-0000-0000-0000000000b2';
  b3 uuid := 'cc000000-0000-0000-0000-0000000000b3';
  bot uuid := 'cc000000-0000-0000-0000-0000000000ff';
  outsider uuid := 'cc000000-0000-0000-0000-0000000000e0';
  room uuid;
  t0 timestamptz := now() - interval '10 minutes';
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (a1,'a1@cv.test'),(a2,'a2@cv.test'),(a3,'a3@cv.test'),
    (b1,'b1@cv.test'),(b2,'b2@cv.test'),(b3,'b3@cv.test'),
    (bot,'bot@cv.test'),(outsider,'out@cv.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (a1,'A1'),(a2,'A2'),(a3,'A3'),(b1,'B1'),(b2,'B2'),(b3,'B3'),(bot,'Bot'),(outsider,'Outsider')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  INSERT INTO public.game_rooms (room_code, host_user_id, status, game_type_key, max_players)
  VALUES ('CAP3V3', a1, 'waiting', 'team_battle', 6) RETURNING id INTO room;

  -- Joined in a known order, so the tie-break is predictable.
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, team, joined_at, is_bot) VALUES
    (room, a1, 'A1', true,  'joined', 'a', t0 + interval '1 min', false),
    (room, a2, 'A2', false, 'joined', 'a', t0 + interval '2 min', false),
    (room, a3, 'A3', false, 'joined', 'a', t0 + interval '3 min', false),
    (room, b1, 'B1', false, 'joined', 'b', t0 + interval '4 min', false),
    (room, b2, 'B2', false, 'joined', 'b', t0 + interval '5 min', false),
    (room, b3, 'B3', false, 'joined', 'b', t0 + interval '6 min', false),
    (room, bot,'Bot',false, 'joined', 'b', t0 + interval '7 min', true);

  RAISE NOTICE '--- a 3-3 room, nobody elected yet';
  PERFORM pg_temp.must_equal(pg_temp.captain_count(room,'a'), 0::bigint, 'team A starts with no captain');
  PERFORM pg_temp.must_equal(pg_temp.captain_count(room,'b'), 0::bigint, 'team B starts with no captain');

  RAISE NOTICE '--- one vote elects';
  PERFORM pg_temp.as_user(a1);
  PERFORM public.tb_vote_captain(room, a2);
  PERFORM pg_temp.must_equal(pg_temp.captain_of(room,'a'), 'A2', 'A1''s vote makes A2 captain');
  PERFORM pg_temp.must_equal(pg_temp.captain_count(room,'a'), 1::bigint, 'exactly one captain on A');
  PERFORM pg_temp.must_equal(pg_temp.captain_count(room,'b'), 0::bigint, 'and B is untouched by A''s vote');

  RAISE NOTICE '--- a 1-1 tie holds with the earliest joiner';
  PERFORM pg_temp.as_user(a2);
  PERFORM public.tb_vote_captain(room, a3);   -- A2: 1 (a1), A3: 1 (a2)
  PERFORM pg_temp.must_equal(pg_temp.captain_of(room,'a'), 'A2',
    'level on votes, the earlier seat keeps the armband');

  RAISE NOTICE '--- plurality: two beats one';
  PERFORM pg_temp.as_user(a1);
  PERFORM public.tb_vote_captain(room, a3);   -- A3: 2 (a1, a2), A2: 0
  PERFORM pg_temp.must_equal(pg_temp.captain_of(room,'a'), 'A3', 'two votes take the armband from one');
  PERFORM pg_temp.must_equal(pg_temp.captain_count(room,'a'), 1::bigint, 'exactly one captain on A');

  RAISE NOTICE '--- changing your mind re-tallies';
  PERFORM pg_temp.as_user(a2);
  PERFORM public.tb_vote_captain(room, a1);   -- A1: 1 (a2), A3: 1 (a1) -> tie, A1 seated first
  PERFORM pg_temp.must_equal(pg_temp.captain_of(room,'a'), 'A1', 'a changed vote moves the armband');
  PERFORM pg_temp.must_equal(pg_temp.captain_count(room,'a'), 1::bigint, 'still exactly one captain on A');

  RAISE NOTICE '--- the other bench elects independently';
  PERFORM pg_temp.as_user(b2);
  PERFORM public.tb_vote_captain(room, b3);
  PERFORM pg_temp.must_equal(pg_temp.captain_of(room,'b'), 'B3', 'B elects its own');
  PERFORM pg_temp.must_equal(pg_temp.captain_of(room,'a'), 'A1', 'without disturbing A''s');

  RAISE NOTICE '--- what is refused';
  PERFORM pg_temp.as_user(a1);
  PERFORM pg_temp.must_fail(format('SELECT public.tb_vote_captain(%L,%L)', room, b1),
    'cannot vote for the other team');
  PERFORM pg_temp.must_fail(format('SELECT public.tb_vote_captain(%L,%L)', room, a1),
    'cannot vote for yourself');
  PERFORM pg_temp.as_user(b1);
  PERFORM pg_temp.must_fail(format('SELECT public.tb_vote_captain(%L,%L)', room, bot),
    'cannot make a bot captain');
  PERFORM pg_temp.as_user(outsider);
  PERFORM pg_temp.must_fail(format('SELECT public.tb_vote_captain(%L,%L)', room, a2),
    'a stranger cannot vote');
  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail(format('SELECT public.tb_vote_captain(%L,%L)', room, a2),
    'a signed-out caller cannot vote');

  RAISE NOTICE '--- ties go to the earliest joiner, and stay there';
  -- Clear A and give A1 and A3 one vote each: A1 joined first.
  UPDATE public.room_participants SET captain_vote = NULL WHERE room_id = room AND team = 'a';
  PERFORM pg_temp.as_user(a2);
  PERFORM public.tb_vote_captain(room, a1);   -- A1: 1
  PERFORM pg_temp.as_user(a1);
  PERFORM public.tb_vote_captain(room, a3);   -- A3: 1  → tie
  PERFORM pg_temp.must_equal(pg_temp.captain_of(room,'a'), 'A1', 'a 1-1 tie goes to the earliest joiner');
  PERFORM pg_temp.must_equal(pg_temp.captain_count(room,'a'), 1::bigint, 'a tie still elects exactly one');

  RAISE NOTICE '--- once the match is running, the vote is closed';
  UPDATE public.game_rooms SET status = 'playing' WHERE id = room;
  PERFORM pg_temp.as_user(a3);
  PERFORM pg_temp.must_fail(format('SELECT public.tb_vote_captain(%L,%L)', room, a3),
    'no votes once the match has started');
  PERFORM pg_temp.as_user(NULL);
END $$;

\echo 'ok: team battle plays, ties, and pays by the rules'
