-- Versus King, executed rather than reviewed (docs/GAME_TYPES_DESIGN.md §3).
--
-- The whole co-op match is decided in SECURITY DEFINER plpgsql — the captain
-- election, whose answer counts, round outcomes, the 3:3 blitz, the payout —
-- and this suite runs it through the public RPCs only. Along the way, every
-- refusal that keeps the match honest: outsiders, a non-captain locking the
-- final, a non-captain playing the blitz, double settlement.
--
-- Same harness as the other suites (see README.md): the shim's auth.uid()
-- reads test.uid, superuser statements are the fixture/inspection channel
-- (deadlines are pushed into the past instead of slept through).

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

-- A round with 5 questions whose correct answers are '<prefix>-c<i>'.
CREATE OR REPLACE FUNCTION pg_temp.mk_round(prefix text)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'category_name', prefix,
    'questions', (
      SELECT jsonb_agg(jsonb_build_object(
        'question_text', prefix || '-q' || i,
        'correct_answer', prefix || '-c' || i,
        'shuffled_answers', jsonb_build_array(prefix || '-c' || i, 'w1', 'w2', 'w3')))
      FROM generate_series(0, 4) i));
$$;

CREATE OR REPLACE FUNCTION pg_temp.mk_board()
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'rounds', (SELECT jsonb_agg(pg_temp.mk_round('r' || i)) FROM generate_series(0, 5) i),
    'blitz', jsonb_build_object(
      'category_name', 'blitz',
      'questions', jsonb_build_array(jsonb_build_object(
        'question_text', 'blitz-q0',
        'correct_answer', 'blitz-c0',
        'shuffled_answers', jsonb_build_array('blitz-c0', 'w1', 'w2', 'w3')))));
$$;

-- ── privilege posture ──────────────────────────────────────────────────────

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('kt_start_match', 'kt_vote_captain', 'kt_pick_answer',
                       'kt_final_answer', 'kt_blitz_answer', 'kt_advance', 'kt_settle')
     AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERTION FAILED: anon can execute: %', bad;
  END IF;
  RAISE NOTICE 'ok: no Versus King RPC is callable by anon';

  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('kt_resolve_captain', 'kt_resolve_question')
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERTION FAILED: internal helpers callable: %', bad;
  END IF;
  RAISE NOTICE 'ok: internal helpers are not callable by authenticated';
END $$;

-- ── the match ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_ana uuid := 'cccccccc-0000-0000-0000-000000000001';  -- host
  v_ben uuid := 'cccccccc-0000-0000-0000-000000000002';
  v_cat uuid := 'cccccccc-0000-0000-0000-000000000003';
  v_dan uuid := 'cccccccc-0000-0000-0000-000000000004';
  v_outsider uuid := 'cccccccc-0000-0000-0000-000000000009';
  v_room uuid;
  v_state public.king_team_state%ROWTYPE;
  v_ben_coins_before integer;
  v_dan_coins_before integer;
  q integer;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_ana, 'ana@vk.test'), (v_ben, 'ben@vk.test'), (v_cat, 'cat@vk.test'),
    (v_dan, 'dan@vk.test'), (v_outsider, 'out@vk.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
    (v_ana, 'Ana', 1000, 0), (v_ben, 'Ben', 1000, 0),
    (v_cat, 'Cat', 1000, 0), (v_dan, 'Dan', 1000, 0),
    (v_outsider, 'Out', 1000, 0)
  ON CONFLICT (user_id) DO UPDATE SET coins = 1000, gems = 0;
  DELETE FROM public.currency_grants WHERE user_id IN (v_ana, v_ben, v_cat, v_dan);

  INSERT INTO public.game_rooms (room_code, host_user_id, status, game_type_key)
  VALUES ('TKING1', v_ana, 'waiting', 'king') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host) VALUES
    (v_room, v_ana, 'Ana', true), (v_room, v_ben, 'Ben', false),
    (v_room, v_cat, 'Cat', false), (v_room, v_dan, 'Dan', false);

  -- Dark launch: the seeded registry row is not live, and the server is the
  -- thing refusing — not the UI.
  PERFORM pg_temp.as_user(v_ana);
  PERFORM pg_temp.must_fail(
    format('SELECT public.kt_start_match(%L, %L::jsonb)', v_room, pg_temp.mk_board()),
    'start refused while king is not live');
  UPDATE public.game_types SET is_live = true WHERE key = 'king';

  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail(
    format('SELECT public.kt_start_match(%L, %L::jsonb)', v_room, pg_temp.mk_board()),
    'anonymous start refused');
  PERFORM pg_temp.as_user(v_ben);
  PERFORM pg_temp.must_fail(
    format('SELECT public.kt_start_match(%L, %L::jsonb)', v_room, pg_temp.mk_board()),
    'non-host start refused');
  PERFORM pg_temp.as_user(v_ana);
  PERFORM pg_temp.must_fail(
    format('SELECT public.kt_start_match(%L, %L::jsonb)', v_room,
           jsonb_build_object('rounds',
             (SELECT jsonb_agg(pg_temp.mk_round('r' || i)) FROM generate_series(0, 4) i))),
    'a five-round board refused');

  PERFORM public.kt_start_match(v_room, pg_temp.mk_board());
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'captain_vote', 'match opens on the captain vote');

  -- ── captain election ────────────────────────────────────────────────────
  PERFORM pg_temp.as_user(v_outsider);
  PERFORM pg_temp.must_fail(
    format('SELECT public.kt_vote_captain(%L, %L)', v_room, v_ben),
    'outsider cannot vote');

  PERFORM pg_temp.as_user(v_ana); PERFORM public.kt_vote_captain(v_room, v_ben);
  PERFORM pg_temp.as_user(v_cat); PERFORM public.kt_vote_captain(v_room, v_ben);
  PERFORM pg_temp.as_user(v_dan); PERFORM public.kt_vote_captain(v_room, v_dan);
  -- The last ballot resolves the election without waiting for the clock.
  PERFORM pg_temp.as_user(v_ben); PERFORM public.kt_vote_captain(v_room, v_ben);

  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'question', 'all ballots in resolves the vote');
  PERFORM pg_temp.must_equal(v_state.captain_user_id, v_ben, 'most-voted player is captain');

  -- ── round 0: the team takes it 3/5 via captain-locked finals ────────────
  FOR q IN 0..4 LOOP
    PERFORM pg_temp.as_user(v_ana); PERFORM public.kt_pick_answer(v_room, 'r0-c' || q);
    PERFORM pg_temp.as_user(v_cat); PERFORM public.kt_pick_answer(v_room, 'w1');

    PERFORM pg_temp.as_user(v_cat);
    PERFORM pg_temp.must_fail(
      format('SELECT public.kt_final_answer(%L, %L)', v_room, 'w1'),
      'q' || q || ': a non-captain cannot lock the final');

    PERFORM pg_temp.as_user(v_ben);
    -- Questions 0-2 locked right, 3-4 locked wrong: the round lands 3/5.
    PERFORM public.kt_final_answer(v_room, CASE WHEN q < 3 THEN 'r0-c' || q ELSE 'w2' END);

    SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
    PERFORM pg_temp.must_equal(v_state.phase, 'reveal', 'q' || q || ': captain lock reveals');

    UPDATE public.king_team_state SET deadline = now() - interval '1 second'
     WHERE room_id = v_room;
    PERFORM pg_temp.as_user(v_dan); PERFORM public.kt_advance(v_room);
  END LOOP;

  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'round_result', 'five reveals close the round');
  PERFORM pg_temp.must_equal(v_state.team_rounds, 1, 'three correct finals take the round');
  PERFORM pg_temp.must_equal(v_state.king_rounds, 0, 'the King got nothing');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_ana),
    5, 'a player who advised right every time has 5 personal points');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_cat),
    0, 'a player who advised wrong has none');

  -- ── round 1: the captain sleeps; his own pick stands in, the round is
  --    lost 1/5 to the King ───────────────────────────────────────────────
  UPDATE public.king_team_state SET deadline = now() - interval '1 second'
   WHERE room_id = v_room;
  PERFORM pg_temp.as_user(v_ana); PERFORM public.kt_advance(v_room);

  FOR q IN 0..4 LOOP
    IF q = 0 THEN
      -- The captain picked right but never locked: his pick stands in.
      PERFORM pg_temp.as_user(v_ben); PERFORM public.kt_pick_answer(v_room, 'r1-c0');
    ELSIF q = 1 THEN
      -- No captain pick; the room's most-voted (wrong) answer stands in.
      PERFORM pg_temp.as_user(v_ana); PERFORM public.kt_pick_answer(v_room, 'w1');
      PERFORM pg_temp.as_user(v_cat); PERFORM public.kt_pick_answer(v_room, 'w1');
    END IF;
    UPDATE public.king_team_state SET deadline = now() - interval '1 second'
     WHERE room_id = v_room;
    PERFORM pg_temp.as_user(v_dan); PERFORM public.kt_advance(v_room);  -- resolve question
    UPDATE public.king_team_state SET deadline = now() - interval '1 second'
     WHERE room_id = v_room;
    PERFORM pg_temp.as_user(v_dan); PERFORM public.kt_advance(v_room);  -- end reveal
  END LOOP;

  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'round_result', 'round 1 closed');
  PERFORM pg_temp.must_equal(v_state.team_rounds, 1, 'one correct final is not enough');
  PERFORM pg_temp.must_equal(v_state.king_rounds, 1, 'the King takes round 1');

  -- ── fast-forward the middle game to a 3:3 tie at the last gun ──────────
  -- The transitions above are proven; replaying rounds 2-5 through the RPCs
  -- would only repeat them. The superuser channel arranges the endgame.
  UPDATE public.king_team_state
     SET round_index = 5, question_index = 4, phase = 'reveal',
         team_rounds = 3, king_rounds = 2, round_correct = 0,
         deadline = now() - interval '1 second'
   WHERE room_id = v_room;
  PERFORM pg_temp.as_user(v_ana); PERFORM public.kt_advance(v_room);  -- → round_result (0/5: King, 3:3)
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.king_rounds, 3, 'the King levels it');

  UPDATE public.king_team_state SET deadline = now() - interval '1 second'
   WHERE room_id = v_room;
  PERFORM pg_temp.as_user(v_ana); PERFORM public.kt_advance(v_room);
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'blitz', 'a 3:3 tie goes to the blitz');

  -- ── the blitz belongs to the captain ────────────────────────────────────
  PERFORM pg_temp.as_user(v_ana);
  PERFORM pg_temp.must_fail(
    format('SELECT public.kt_blitz_answer(%L, %L)', v_room, 'blitz-c0'),
    'a non-captain cannot play the blitz');
  PERFORM pg_temp.as_user(v_ben);
  PERFORM public.kt_blitz_answer(v_room, 'blitz-c0');
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.phase, 'done', 'the blitz ends the match');
  PERFORM pg_temp.must_equal(v_state.winner, 'team', 'a correct blitz answer dethrones the King');

  -- ── settlement: everyone shows up, everyone wins, exactly once ─────────
  SELECT coins INTO v_ben_coins_before FROM public.profiles WHERE user_id = v_ben;
  SELECT coins INTO v_dan_coins_before FROM public.profiles WHERE user_id = v_dan;

  PERFORM pg_temp.as_user(v_dan);
  PERFORM public.kt_settle(v_room);
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_ben),
    v_ben_coins_before + 250, 'a winning player is paid win + participation');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_dan),
    v_dan_coins_before + 250, 'every teammate shares the same purse');
  PERFORM pg_temp.must_equal(
    (SELECT winner_user_id FROM public.room_games
      WHERE id = v_state.game_id), v_ben, 'the captain of a winning team is the history winner');
  PERFORM pg_temp.must_equal(
    (SELECT total_wins FROM public.room_participants
      WHERE room_id = v_room AND user_id = v_cat), 1, 'a win accrues to the whole team');
  PERFORM pg_temp.must_equal(
    (SELECT status::text FROM public.game_rooms WHERE id = v_room),
    'waiting', 'the room parks back at waiting for a rematch');

  PERFORM pg_temp.as_user(v_ana);
  PERFORM public.kt_settle(v_room);
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_ben),
    v_ben_coins_before + 250, 'a repeat settle pays nothing more');

  -- ── a lost blitz crowns the King ───────────────────────────────────────
  UPDATE public.king_team_state
     SET phase = 'blitz', winner = NULL, settled = false,
         deadline = now() - interval '1 second'
   WHERE room_id = v_room;
  PERFORM pg_temp.as_user(v_cat); PERFORM public.kt_advance(v_room);
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = v_room;
  PERFORM pg_temp.must_equal(v_state.winner, 'king', 'a silent blitz crowns the King');

  -- Cleanup so reruns start clean.
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.game_types SET is_live = false WHERE key = 'king';
  DELETE FROM public.room_match_history WHERE room_id = v_room;
  DELETE FROM public.game_rooms WHERE id = v_room;
  DELETE FROM public.currency_grants WHERE user_id IN (v_ana, v_ben, v_cat, v_dan);
END $$;
