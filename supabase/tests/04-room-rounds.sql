-- Multi-round room scoring, as assertions.
--
-- The bug this guards against: cumulative round totals
-- (room_participants.total_score / total_rounds_played / total_wins) were
-- written client-side by the host, one row per participant — and RLS reduced
-- every cross-row write to a silent no-op, so non-hosts read 0 points and
-- 0 rounds on the scoreboard forever. complete_room_round moved the whole
-- round-completion write-set server-side; these assertions pin down its
-- contract: any participant may call it, it accumulates for EVERY
-- participant, exactly once per round, and outsiders are refused.

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
  v_host uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_friend uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_outsider uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  v_room uuid;
  v_game1 uuid;
  v_game2 uuid;
  r record;
BEGIN
  -- A two-player room mid-way through its first round.
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('T4RND1', v_host, 'playing') RETURNING id INTO v_room;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, v_host, 'host', true, 120),
         (v_room, v_friend, 'friend', false, 275);

  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 1) RETURNING id INTO v_game1;

  -- Refusals first: anonymous and non-participant callers.
  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail(
    format('SELECT public.complete_room_round(%L, %L)', v_room, v_game1),
    'anonymous caller refused');
  PERFORM pg_temp.as_user(v_outsider);
  PERFORM pg_temp.must_fail(
    format('SELECT public.complete_room_round(%L, %L)', v_room, v_game1),
    'non-participant refused');

  -- The FRIEND (not the host) completes the round — the exact case the old
  -- client-side path could never handle.
  PERFORM pg_temp.as_user(v_friend);
  PERFORM pg_temp.must_equal(
    public.complete_room_round(v_room, v_game1), true,
    'first call applies the round');

  SELECT total_score, total_rounds_played, total_wins INTO r
  FROM public.room_participants WHERE room_id = v_room AND user_id = v_friend;
  PERFORM pg_temp.must_equal(r.total_score, 275, 'winner total_score accumulated');
  PERFORM pg_temp.must_equal(r.total_rounds_played, 1, 'winner rounds counted');
  PERFORM pg_temp.must_equal(r.total_wins, 1, 'winner win counted');

  SELECT total_score, total_rounds_played, total_wins INTO r
  FROM public.room_participants WHERE room_id = v_room AND user_id = v_host;
  PERFORM pg_temp.must_equal(r.total_score, 120, 'loser total_score accumulated');
  PERFORM pg_temp.must_equal(r.total_rounds_played, 1, 'loser rounds counted');
  PERFORM pg_temp.must_equal(r.total_wins, 0, 'loser has no win');

  PERFORM pg_temp.must_equal(
    (SELECT winner_user_id FROM public.room_games WHERE id = v_game1), v_friend,
    'room_games winner recorded');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_match_history WHERE room_id = v_room), 1,
    'one match history row per round');

  -- Every other device calls it too; nothing may double.
  PERFORM pg_temp.as_user(v_host);
  PERFORM pg_temp.must_equal(
    public.complete_room_round(v_room, v_game1), false,
    'second call is a no-op');
  PERFORM pg_temp.must_equal(
    (SELECT total_rounds_played FROM public.room_participants
     WHERE room_id = v_room AND user_id = v_friend), 1,
    'no double count on repeat call');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_match_history WHERE room_id = v_room), 1,
    'no duplicate history row');

  -- Round 2: reset per-round scores the way the app does, play, complete.
  PERFORM public.reset_room_participants(v_room, 'playing');
  UPDATE public.room_participants SET score = 200 WHERE room_id = v_room AND user_id = v_host;
  UPDATE public.room_participants SET score = 50 WHERE room_id = v_room AND user_id = v_friend;
  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 2) RETURNING id INTO v_game2;

  PERFORM pg_temp.as_user(v_host);
  PERFORM pg_temp.must_equal(
    public.complete_room_round(v_room, v_game2), true,
    'next round applies with its own game id');

  SELECT total_score, total_rounds_played, total_wins INTO r
  FROM public.room_participants WHERE room_id = v_room AND user_id = v_friend;
  PERFORM pg_temp.must_equal(r.total_score, 325, 'totals carry across rounds');
  PERFORM pg_temp.must_equal(r.total_rounds_played, 2, 'round count carries across rounds');
  PERFORM pg_temp.must_equal(r.total_wins, 1, 'wins only for rounds actually won');

  -- Cleanup so reruns start clean.
  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.room_match_history WHERE room_id = v_room;
  DELETE FROM public.game_rooms WHERE id = v_room;
END $$;
