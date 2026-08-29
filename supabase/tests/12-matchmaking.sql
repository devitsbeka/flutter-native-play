-- Global matchmaking, executed rather than reviewed
-- (docs/GAME_TYPES_DESIGN.md §5).
--
-- The matcher runs inside the enqueue call under a per-bucket advisory lock
-- and creates the room in the same transaction that stamps the queue rows —
-- so the properties worth asserting are behavioural: buckets never leak
-- across languages, FIFO cuts the match the instant the bucket fills, the
-- room comes out shaped right for its game type (host, participants, teams,
-- not-permanent), the dark launch holds against hand-crafted calls, and
-- expiry/cancel/re-enqueue leave exactly one waiting entry per player.
--
-- Same harness as the other suites (see README.md).

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

-- ── privilege posture ──────────────────────────────────────────────────────

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('mm_enqueue', 'mm_cancel', 'mm_status')
     AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'anon can call: % -- revoke FROM PUBLIC, anon', bad;
  END IF;
  RAISE NOTICE 'ok: no matchmaking RPC is reachable by anon';
END $$;

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('mm_try_match', 'mm_required_players', 'mm_entry_state')
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'internal helper callable by a client role: %', bad;
  END IF;
  RAISE NOTICE 'ok: the matcher is not callable by client roles';
END $$;

-- Owner-only SELECT (that is what scopes the realtime "you are matched"
-- event to its owner), and no client writes at all.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'matchmaking_queue' AND cmd = 'SELECT';
  PERFORM pg_temp.must_equal(n, 1::bigint, 'exactly one SELECT policy on the queue');
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'matchmaking_queue'
     AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  PERFORM pg_temp.must_equal(n, 0::bigint, 'no client write policies on the queue');
END $$;

-- ── behaviour ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_m1 uuid := 'ad000000-0000-0000-0000-00000000000a';
  v_m2 uuid := 'ad000000-0000-0000-0000-00000000000b';
  v_m3 uuid := 'ad000000-0000-0000-0000-00000000000c';
  v_m4 uuid := 'ad000000-0000-0000-0000-00000000000d';
  v_state jsonb;
  v_room uuid;
  n integer;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_m1, 'mm1@tb.test'), (v_m2, 'mm2@tb.test'),
    (v_m3, 'mm3@tb.test'), (v_m4, 'mm4@tb.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
    (v_m1, 'mm-one', 0, 0), (v_m2, 'mm-two', 0, 0),
    (v_m3, 'mm-three', 0, 0), (v_m4, 'mm-four', 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  DELETE FROM public.matchmaking_queue
   WHERE user_id IN (v_m1, v_m2, v_m3, v_m4);

  -- What the queue refuses.
  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail('SELECT public.mm_enqueue(''classic'', ''en'')',
    'anonymous caller cannot queue');
  PERFORM pg_temp.as_user(v_m1);
  PERFORM pg_temp.must_fail('SELECT public.mm_enqueue(''nonsense'', ''en'')',
    'an unknown game type has no queue');
  PERFORM pg_temp.must_fail('SELECT public.mm_enqueue(''king'', ''en'')',
    'a solo mode has no queue');
  PERFORM pg_temp.must_fail('SELECT public.mm_enqueue(''team_battle'', ''en'')',
    'the dark launch holds: a non-live mode takes no queue entries');

  -- Classic 1v1: one waiter stays waiting; a different language does not
  -- fill the bucket; the same language does, instantly.
  v_state := public.mm_enqueue('classic', 'en');
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'waiting', 'the first player waits');

  PERFORM pg_temp.as_user(v_m2);
  v_state := public.mm_enqueue('classic', 'ka');
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'waiting',
    'another language never fills the bucket');

  PERFORM pg_temp.as_user(v_m3);
  v_state := public.mm_enqueue('classic', 'en');
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'matched',
    'the second same-language player is matched before enqueue returns');
  PERFORM pg_temp.must_equal((v_state ->> 'room_code') IS NOT NULL, true,
    'the match hands back a room code');
  v_room := (v_state ->> 'matched_room_id')::uuid;

  PERFORM pg_temp.must_equal(
    (SELECT game_type_key FROM public.game_rooms WHERE id = v_room), 'classic',
    'the room carries its game type');
  PERFORM pg_temp.must_equal(
    (SELECT is_permanent FROM public.game_rooms WHERE id = v_room), false,
    'matchmade rooms are not permanent (the cleaner may reap them)');
  PERFORM pg_temp.must_equal(
    (SELECT host_user_id FROM public.game_rooms WHERE id = v_room), v_m1,
    'the longest-waiting player hosts');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants WHERE room_id = v_room), 2,
    'both players are in the room');
  PERFORM pg_temp.must_equal(
    (SELECT status FROM public.matchmaking_queue
      WHERE user_id = v_m1 ORDER BY enqueued_at DESC LIMIT 1)::text, 'matched',
    'the waiting player''s row was stamped too');

  -- One waiting entry per player: a re-enqueue replaces, cancel resolves,
  -- and a stale wait expires on the owner''s next status call.
  PERFORM pg_temp.as_user(v_m2);
  v_state := public.mm_enqueue('classic', 'en');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.matchmaking_queue
      WHERE user_id = v_m2 AND status = 'waiting'), 1,
    're-enqueueing replaces the old wait');
  v_state := public.mm_cancel();
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'cancelled', 'cancel resolves the wait');

  v_state := public.mm_enqueue('classic', 'en');
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.matchmaking_queue
     SET enqueued_at = now() - interval '3 minutes'
   WHERE user_id = v_m2 AND status = 'waiting';
  PERFORM pg_temp.as_user(v_m2);
  v_state := public.mm_status();
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'expired',
    'a 2-minute wait expires on the owner''s next look');

  -- Team battle 2v2: flip the mode live (superuser, standing in for the
  -- launch UPDATE), fill the bucket with four, and the room comes out with
  -- alternating pre-assigned teams.
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.game_types SET is_live = true WHERE key = 'team_battle';

  PERFORM pg_temp.as_user(v_m1);
  v_state := public.mm_enqueue('team_battle', 'en', 2);
  PERFORM pg_temp.as_user(v_m2);
  v_state := public.mm_enqueue('team_battle', 'en', 2);
  PERFORM pg_temp.as_user(v_m3);
  v_state := public.mm_enqueue('team_battle', 'en', 2);
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'waiting',
    'three of four is not a team battle');
  PERFORM pg_temp.as_user(v_m4);
  v_state := public.mm_enqueue('team_battle', 'en', 2);
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'matched', 'the fourth completes 2v2');
  v_room := (v_state ->> 'matched_room_id')::uuid;

  PERFORM pg_temp.must_equal(
    (SELECT game_type_key FROM public.game_rooms WHERE id = v_room), 'team_battle',
    'the room is a team battle room');
  SELECT count(*) INTO n FROM public.room_participants
   WHERE room_id = v_room AND team = 'a';
  PERFORM pg_temp.must_equal(n, 2, 'two players landed on team a');
  SELECT count(*) INTO n FROM public.room_participants
   WHERE room_id = v_room AND team = 'b';
  PERFORM pg_temp.must_equal(n, 2, 'two players landed on team b');
  PERFORM pg_temp.must_equal(
    (SELECT host_user_id FROM public.game_rooms WHERE id = v_room), v_m1,
    'the longest-waiting player hosts the team battle too');

  -- Restore the seed state: the mode stays dark until its real launch.
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.game_types SET is_live = false WHERE key = 'team_battle';

  -- Cleanup so reruns start clean.
  DELETE FROM public.matchmaking_queue WHERE user_id IN (v_m1, v_m2, v_m3, v_m4);
  DELETE FROM public.game_rooms
   WHERE host_user_id IN (v_m1, v_m2, v_m3, v_m4) AND is_permanent = false;
END $$;

\echo 'ok: the global queue matches by the rules'
