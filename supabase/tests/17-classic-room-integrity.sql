-- Classic multiplayer rooms: the three integrity gaps from
-- docs/qa-app-store-2026-09/02-classic-rooms-findings.md, executed rather
-- than reviewed. Same harness as the other suites (see README.md).
--
--   1. A duplicate answer for the same (room, user, question_index) is
--      rejected at the database, not just discouraged client-side.
--   2. increment_participant_score(room, question_index) pays only a real,
--      correct, not-yet-scored answer, computes the award itself instead of
--      trusting the row's points_earned, never pays a "Most Likely To" vote
--      question, and never pays the same question twice.
--   3. join_classic_room refuses the seat once a room is at max_players,
--      proven by joining right up to the limit and then one more.
--
-- Sequential coverage only for capacity (3): a single psql script has one
-- connection, so this proves "the Nth+1 join is rejected" rather than true
-- concurrent overselling. The race itself (several joins landing at once)
-- is what SELECT ... FOR UPDATE in join_classic_room serializes against;
-- that lock is what a genuine concurrency run would exercise, and one was
-- run separately with real parallel connections (see the PR/session notes)
-- rather than from this file.

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

-- ── Finding 1: duplicate answer insert is rejected ──────────────────────────

DO $$
DECLARE
  v_room uuid;
  v_user uuid := 'aaaa1111-0000-0000-0000-000000000101';
BEGIN
  INSERT INTO public.game_rooms (room_code, host_user_id, status, max_players)
  VALUES ('F1DUPE', v_user, 'playing', 5) RETURNING id INTO v_room;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host)
  VALUES (v_room, v_user, 'solo', true);

  PERFORM pg_temp.as_user(v_user);

  INSERT INTO public.player_answers
    (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
  VALUES (v_room, v_user, 0, 'Paris', true, 10, 200);

  PERFORM pg_temp.must_fail(
    format(
      'INSERT INTO public.player_answers
         (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
       VALUES (%L, %L, 0, %L, true, 8, 180)',
      v_room, v_user, 'Paris'),
    'a second insert for the same (room, user, question_index) is rejected');

  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.player_answers
      WHERE room_id = v_room AND user_id = v_user AND question_index = 0),
    1, 'exactly one answer row survives the retry');

  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.game_rooms WHERE id = v_room;
END $$;

-- ── Finding 2: increment_participant_score pays exactly one real answer ────

DO $$
DECLARE
  v_room uuid;
  v_game uuid;
  v_user uuid := 'aaaa1111-0000-0000-0000-000000000201';
  v_other uuid := 'aaaa1111-0000-0000-0000-000000000202';
BEGIN
  INSERT INTO public.game_rooms (room_code, host_user_id, status, max_players)
  VALUES ('F2SCOR', v_user, 'playing', 5) RETURNING id INTO v_room;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, v_user, 'me', true, 0),
         (v_room, v_other, 'other', false, 0);

  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1)
  RETURNING id INTO v_game;
  UPDATE public.game_rooms SET current_game_id = v_game WHERE id = v_room;

  PERFORM pg_temp.as_user(v_user);

  -- No player_answers row at all for question 0 yet: nothing to pay.
  PERFORM public.increment_participant_score(v_room, 0);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_user),
    0, 'no answer row: no credit');

  -- A wrong answer on question 0: still nothing to pay.
  INSERT INTO public.player_answers
    (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
  VALUES (v_room, v_user, 0, 'wrong', false, 12, 0);
  PERFORM public.increment_participant_score(v_room, 0);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_user),
    0, 'wrong answer: no credit');

  -- A correct answer on question 1, 10 seconds left: 100 + 10*10 = 200.
  -- points_earned is set to a clearly-forged number to prove the RPC
  -- recomputes the award from is_correct/time_remaining rather than
  -- trusting the client-written column.
  INSERT INTO public.player_answers
    (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
  VALUES (v_room, v_user, 1, 'Paris', true, 10, 999999);
  PERFORM public.increment_participant_score(v_room, 1);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_user),
    200, 'correct answer pays base + time bonus, not the forged points_earned');
  PERFORM pg_temp.must_equal(
    (SELECT scored FROM public.player_answers
      WHERE room_id = v_room AND user_id = v_user AND question_index = 1),
    true, 'the paid row is marked scored');

  -- Calling it again for the same question must not pay twice.
  PERFORM public.increment_participant_score(v_room, 1);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_user),
    200, 'repeat call for an already-scored question is a silent no-op');

  -- First-correct bonus: claim it the way submitAnswer does, then a correct
  -- answer on question 2 should pay base + bonus.
  INSERT INTO public.room_first_correct (game_id, question_index, user_id)
  VALUES (v_game, 2, v_user);
  INSERT INTO public.player_answers
    (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
  VALUES (v_room, v_user, 2, 'Paris', true, 0, 0);
  PERFORM public.increment_participant_score(v_room, 2);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_user),
    325, 'first-correct bonus (100 base + 25) added on top');

  -- "Most Likely To": a vote question's row_questions sentinel means this
  -- path pays nothing even for a row already marked is_correct = true -
  -- settle_most_likely_votes owns that payout, not this RPC.
  INSERT INTO public.room_questions
    (room_id, game_id, question_index, question_text, correct_answer, incorrect_answers)
  VALUES (v_room, v_game, 3, 'Most likely to be late?', '__vote__', '[]'::jsonb);
  INSERT INTO public.player_answers
    (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
  VALUES (v_room, v_user, 3, v_other::text, true, 5, 100);
  PERFORM public.increment_participant_score(v_room, 3);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_user),
    325, 'a vote-round question is never paid through increment_participant_score');

  -- Direct self-credit with zero player_answers rows for a not-yet-played
  -- question: this is exactly the abuse scenario from Finding 2 (three raw
  -- calls took a fresh participant from 0 to 825 pre-fix).
  PERFORM public.increment_participant_score(v_room, 4);
  PERFORM public.increment_participant_score(v_room, 4);
  PERFORM public.increment_participant_score(v_room, 4);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_user),
    325, 'repeated calls with no matching answer never move the score');

  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.room_first_correct WHERE game_id = v_game;
  DELETE FROM public.game_rooms WHERE id = v_room;
END $$;

-- ── Finding 2 (observer bonus split): only the room's own observing host ───

DO $$
DECLARE
  v_room uuid;
  v_host uuid := 'aaaa1111-0000-0000-0000-000000000301';
  v_player uuid := 'aaaa1111-0000-0000-0000-000000000302';
  v_stranger uuid := 'aaaa1111-0000-0000-0000-000000000303';
BEGIN
  INSERT INTO public.game_rooms (room_code, host_user_id, status, max_players, host_is_observer)
  VALUES ('F2OBS', v_host, 'playing', 5, false) RETURNING id INTO v_room;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, v_host, 'host', true, 0),
         (v_room, v_player, 'player', false, 0);

  -- Not this room's host at all: no credit.
  PERFORM pg_temp.as_user(v_stranger);
  PERFORM public.award_room_observer_bonus(v_room, 150);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_host),
    0, 'a non-host caller earns nothing');

  -- The host, but the room isn't in observer mode: still no credit.
  PERFORM pg_temp.as_user(v_host);
  PERFORM public.award_room_observer_bonus(v_room, 150);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_host),
    0, 'the host earns nothing while host_is_observer is false');

  -- Now the legitimate case: host_is_observer true, the host calls it.
  UPDATE public.game_rooms SET host_is_observer = true WHERE id = v_room;
  PERFORM public.award_room_observer_bonus(v_room, 150);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_host),
    150, 'the observing host is credited the bonus');

  -- Still clamped to one question's worth per call.
  PERFORM public.award_room_observer_bonus(v_room, 999999);
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_host),
    425, 'a call is clamped to 275, same ceiling as an answer');

  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.game_rooms WHERE id = v_room;
END $$;

-- ── Finding 3: room capacity is enforced atomically, server-side ───────────

DO $$
DECLARE
  v_room uuid;
  v_host uuid := 'aaaa1111-0000-0000-0000-000000000401';
  v_p1 uuid := 'aaaa1111-0000-0000-0000-000000000402';
  v_p2 uuid := 'aaaa1111-0000-0000-0000-000000000403';
  v_p3 uuid := 'aaaa1111-0000-0000-0000-000000000404';
BEGIN
  -- max_players = 2: the host's own seat plus exactly one joiner.
  INSERT INTO public.game_rooms (room_code, host_user_id, status, max_players)
  VALUES ('F3FULL', v_host, 'waiting', 2) RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host)
  VALUES (v_room, v_host, 'host', true);

  -- First joiner: the room has one free seat, so this succeeds.
  PERFORM pg_temp.as_user(v_p1);
  PERFORM public.join_classic_room(v_room, 'p1', NULL, 'GE');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants WHERE room_id = v_room),
    2, 'the room is now at max_players');

  -- Second joiner: the room is already full — this is the Nth+1 join the
  -- old client-side count-then-insert let through under concurrency.
  PERFORM pg_temp.as_user(v_p2);
  PERFORM pg_temp.must_fail(
    format('SELECT public.join_classic_room(%L, %L, NULL, %L)', v_room, 'p2', 'GE'),
    'a join past max_players is refused');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants WHERE room_id = v_room),
    2, 'the rejected join left no row behind');

  -- A THIRD joiner attempting right after the rejection: still refused.
  -- Run several times in a row to stand in for the sequential half of "the
  -- Nth+1 join is always rejected" (see the file header for what this does
  -- and does not prove about genuine concurrency).
  PERFORM pg_temp.as_user(v_p3);
  FOR i IN 1..5 LOOP
    PERFORM pg_temp.must_fail(
      format('SELECT public.join_classic_room(%L, %L, NULL, %L)', v_room, 'p3', 'GE'),
      format('repeat join attempt %s past capacity is still refused', i));
  END LOOP;
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants WHERE room_id = v_room),
    2, 'the room never exceeds max_players across repeated attempts');

  -- Already-seated caller: a second call is a harmless no-op, not an error
  -- and not a second row.
  PERFORM pg_temp.as_user(v_p1);
  PERFORM public.join_classic_room(v_room, 'p1-again', NULL, 'GE');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants WHERE room_id = v_room),
    2, 'joining again as an already-seated participant does not add a row');

  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.game_rooms WHERE id = v_room;
END $$;

SELECT 'classic room integrity: all assertions passed' AS result;
