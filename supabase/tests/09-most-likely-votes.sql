-- "Most Likely To" vote settlement, as assertions.
--
-- The mechanic: every player votes for a player (their answer is a player
-- name), and the most-voted name is the round's correct answer. There is no
-- client-knowable correct answer, so the payout CANNOT ride the normal
-- submitAnswer path — settle_most_likely_votes tallies server-side, exactly
-- once per (game, question), and pays every majority voter a flat 100 into
-- room_participants.score. These assertions pin down that contract: any
-- participant may settle, outsiders and anon are refused, a split top vote
-- (a tie) records the tied names but pays NOBODY — majority decides, no
-- majority means no correct answer — timeouts (empty answers) never count,
-- repeat calls are no-ops, and a normal trivia question can never be
-- "settled" into free points.

\set ON_ERROR_STOP on

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

-- ── fixtures ───────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_ana uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  v_ben uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  v_cat uuid := 'bbbbbbbb-0000-0000-0000-000000000003';
  v_dan uuid := 'bbbbbbbb-0000-0000-0000-000000000004';
  v_outsider uuid := 'bbbbbbbb-0000-0000-0000-000000000009';
  v_room uuid;
  v_game uuid;
  r record;
BEGIN
  -- A four-player vote round mid-way through.
  INSERT INTO public.game_rooms (room_code, host_user_id, status, category_id)
  VALUES ('T9MLT1', v_ana, 'playing', 'most_likely_to') RETURNING id INTO v_room;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, v_ana, 'Ana', true, 0),
         (v_room, v_ben, 'Ben', false, 0),
         (v_room, v_cat, 'Cat', false, 0),
         (v_room, v_dan, 'Dan', false, 0);

  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 1) RETURNING id INTO v_game;

  -- Q0 and Q1 are vote prompts; Q2 is a NORMAL trivia question in the same
  -- game (cannot happen in the app, but the function must not care); Q3 is a
  -- vote prompt nobody voted on (everyone timed out).
  INSERT INTO public.room_questions
    (room_id, game_id, question_index, question_text, correct_answer, incorrect_answers, shuffled_answers)
  VALUES
    (v_room, v_game, 0, 'Who wakes up the earliest?', '__vote__', '[]'::jsonb, '{Ana,Ben,Cat,Dan}'),
    (v_room, v_game, 1, 'Who talks the most?',        '__vote__', '[]'::jsonb, '{Ana,Ben,Cat,Dan}'),
    (v_room, v_game, 2, '2 + 2 = ?',                  '4', '["3","5","22"]'::jsonb, '{3,4,5,22}'),
    (v_room, v_game, 3, 'Who loves winter the most?', '__vote__', '[]'::jsonb, '{Ana,Ben,Cat,Dan}');

  -- Q0: Ben wins 3-1 (Ana, Ben and Cat vote Ben; Dan votes Cat).
  INSERT INTO public.player_answers (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
  VALUES (v_room, v_ana, 0, 'Ben', false, 8, 0),
         (v_room, v_ben, 0, 'Ben', false, 7, 0),
         (v_room, v_cat, 0, 'Ben', false, 5, 0),
         (v_room, v_dan, 0, 'Cat', false, 3, 0);

  -- Q1: a 1-1 tie between Ana and Ben; Cat and Dan timed out (empty answer).
  INSERT INTO public.player_answers (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
  VALUES (v_room, v_ana, 1, 'Ben', false, 8, 0),
         (v_room, v_ben, 1, 'Ana', false, 7, 0),
         (v_room, v_cat, 1, '',    false, 0, 0),
         (v_room, v_dan, 1, '',    false, 0, 0);

  -- Q2: normal trivia, answered normally (points already granted in play).
  INSERT INTO public.player_answers (room_id, user_id, question_index, answer, is_correct, time_remaining, points_earned)
  VALUES (v_room, v_ana, 2, '4', true, 9, 190);

  -- Refusals first: anonymous and non-participant callers.
  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail(
    format('SELECT public.settle_most_likely_votes(%L, %L, 0)', v_room, v_game),
    'anonymous caller refused');
  PERFORM pg_temp.as_user(v_outsider);
  PERFORM pg_temp.must_fail(
    format('SELECT public.settle_most_likely_votes(%L, %L, 0)', v_room, v_game),
    'non-participant refused');
  PERFORM pg_temp.as_user(v_dan);
  PERFORM pg_temp.must_fail(
    format('SELECT public.settle_most_likely_votes(%L, %L, 0)', v_room, gen_random_uuid()),
    'game of another room refused');

  -- Dan (who did NOT vote for the winner) settles Q0 — any participant may.
  PERFORM pg_temp.as_user(v_dan);
  PERFORM pg_temp.must_equal(
    public.settle_most_likely_votes(v_room, v_game, 0), 1,
    'first settle claims the question');

  SELECT winners, vote_counts INTO r
  FROM public.room_vote_results WHERE game_id = v_game AND question_index = 0;
  PERFORM pg_temp.must_equal(r.winners, ARRAY['Ben'], 'majority name recorded as winner');
  PERFORM pg_temp.must_equal(r.vote_counts->>'Ben', '3', 'vote counts recorded');

  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_ana),
    100, 'majority voter paid');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_ben),
    100, 'voting for yourself still pays when the room agrees');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_dan),
    0, 'minority voter not paid');
  PERFORM pg_temp.must_equal(
    (SELECT is_correct FROM public.player_answers
     WHERE room_id = v_room AND user_id = v_ana AND question_index = 0),
    true, 'majority answer marked correct');
  PERFORM pg_temp.must_equal(
    (SELECT points_earned FROM public.player_answers
     WHERE room_id = v_room AND user_id = v_ana AND question_index = 0),
    100, 'majority answer carries its points');
  PERFORM pg_temp.must_equal(
    (SELECT is_correct FROM public.player_answers
     WHERE room_id = v_room AND user_id = v_dan AND question_index = 0),
    false, 'minority answer stays wrong');

  -- Every device calls settle when it sees all votes in; nothing may double.
  PERFORM pg_temp.as_user(v_ana);
  PERFORM pg_temp.must_equal(
    public.settle_most_likely_votes(v_room, v_game, 0), 0,
    'second settle is a no-op');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_ana),
    100, 'no double pay on repeat settle');

  -- The results-screen sweep (NULL index) settles everything still open:
  -- the Q1 tie records both names but pays NEITHER side, empty answers never
  -- count, the Q3 no-votes prompt settles with no winners, and the NORMAL
  -- question Q2 is untouched.
  PERFORM pg_temp.must_equal(
    public.settle_most_likely_votes(v_room, v_game, NULL), 2,
    'sweep settles the two open vote questions');

  SELECT winners INTO r
  FROM public.room_vote_results WHERE game_id = v_game AND question_index = 1;
  PERFORM pg_temp.must_equal(r.winners, ARRAY['Ana','Ben'], 'a split top vote records the tied names');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_ana),
    100, 'a split vote pays nobody (Ana keeps only her Q0 payout)');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_ben),
    100, 'a split vote pays nobody (Ben keeps only his Q0 payout)');
  PERFORM pg_temp.must_equal(
    (SELECT is_correct FROM public.player_answers
     WHERE room_id = v_room AND user_id = v_ana AND question_index = 1),
    false, 'no answer of a split vote is marked correct');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_cat),
    100, 'timeout (empty answer) adds nothing to the Q0 payout');
  PERFORM pg_temp.must_equal(
    (SELECT score FROM public.room_participants WHERE room_id = v_room AND user_id = v_dan),
    0, 'minority vote then timeout never pays');

  SELECT winners INTO r
  FROM public.room_vote_results WHERE game_id = v_game AND question_index = 3;
  PERFORM pg_temp.must_equal(r.winners, '{}'::text[], 'no votes means no winners');

  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_vote_results
     WHERE game_id = v_game AND question_index = 2),
    0, 'a normal trivia question is never settled');
  PERFORM pg_temp.must_equal(
    (SELECT points_earned FROM public.player_answers
     WHERE room_id = v_room AND user_id = v_ana AND question_index = 2),
    190, 'normal answers keep their own points');

  -- The flat payout must stay inside the per-question ceiling the score
  -- clamp enforces on live play (bound_score_and_vip_powers caps a delta at
  -- 275) — the settlement writes directly, but the two policies should agree.
  PERFORM pg_temp.must_equal(100 <= 275, true, 'vote payout under the score clamp');

  -- Cleanup so reruns start clean.
  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.room_vote_results WHERE room_id = v_room;
  DELETE FROM public.game_rooms WHERE id = v_room;
END $$;
