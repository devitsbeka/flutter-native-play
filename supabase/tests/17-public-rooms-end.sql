-- A public room ends with its play, executed rather than reviewed.
--
-- What this pins down: the one rule for a public room being OVER (quiet an
-- hour, and mid-round, finished, or back in waiting with nothing to play
-- after having been played), that the Public tab refuses to list such a
-- room before anything sweeps it, that the sweep closes exactly those rooms
-- — cancelled and archived — and leaves every other room alone, private
-- ones above all, and that nobody anonymous can run it.
--
-- Same harness as the other suites (see README.md).

\set ON_ERROR_STOP on
\pset pager off

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
     AND p.proname IN ('sweep_ended_public_rooms', 'public_room_is_over', 'public_rooms')
     AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'anon can call: % -- revoke FROM PUBLIC, anon', bad;
  END IF;
  RAISE NOTICE 'ok: neither the rule nor the sweep is reachable by anon';
END $$;

-- ── the rule, the listing, the sweep ───────────────────────────────────────

DO $$
DECLARE
  v_host  uuid := 'ed000000-0000-0000-0000-00000000000a';
  v_other uuid := 'ed000000-0000-0000-0000-00000000000b';
  v_over_done   uuid;  -- public, completed two hours ago: over
  v_over_stuck  uuid;  -- public, stuck in playing since yesterday: over
  v_over_empty  uuid;  -- public, played, back in waiting with nothing to play, quiet: over
  v_fresh_done  uuid;  -- public, completed ten minutes ago: the table may still rematch
  v_rematch     uuid;  -- public, waiting with a category, quiet: the next game, stays
  v_queued      uuid;  -- public, waiting with nothing of its own but a queued round: stays
  v_building    uuid;  -- public, waiting, never played, quiet: not over (the week-old rule's)
  v_private     uuid;  -- private, completed two hours ago: never over
  n integer;
  listed text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host,  'host@end.test'),
    (v_other, 'other@end.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host'), (v_other, 'Other')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  -- Re-runnable against a database that has seen this file before.
  DELETE FROM public.game_rooms WHERE host_user_id = v_host;

  INSERT INTO public.game_rooms
    (room_code, host_user_id, room_name, status, is_public, created_at, last_activity_at, started_at, completed_at, category_id)
  VALUES
    ('END001', v_host, 'done long ago',  'completed', true,  now() - interval '3 hours',  now() - interval '2 hours',    now() - interval '2 hours 10 minutes', now() - interval '2 hours', NULL),
    ('END002', v_host, 'stuck playing',  'playing',   true,  now() - interval '1 day',    now() - interval '23 hours',   now() - interval '23 hours', NULL, NULL),
    ('END003', v_host, 'played out',     'waiting',   true,  now() - interval '3 hours',  now() - interval '2 hours',    now() - interval '2 hours 10 minutes', now() - interval '2 hours', NULL),
    ('END004', v_host, 'just finished',  'completed', true,  now() - interval '1 hour',   now() - interval '10 minutes', now() - interval '20 minutes', now() - interval '10 minutes', NULL),
    ('END005', v_host, 'rematch set',    'waiting',   true,  now() - interval '3 hours',  now() - interval '2 hours',    now() - interval '2 hours 10 minutes', now() - interval '2 hours', 'history'),
    ('END006', v_host, 'queued',         'waiting',   true,  now() - interval '3 hours',  now() - interval '2 hours',    now() - interval '2 hours 10 minutes', now() - interval '2 hours', NULL),
    ('END007', v_host, 'still building', 'waiting',   true,  now() - interval '3 hours',  now() - interval '3 hours',    NULL, NULL, NULL),
    ('END008', v_host, 'private, done',  'completed', false, now() - interval '3 hours',  now() - interval '2 hours',    now() - interval '2 hours 10 minutes', now() - interval '2 hours', NULL);

  SELECT id INTO v_over_done  FROM public.game_rooms WHERE room_code = 'END001';
  SELECT id INTO v_over_stuck FROM public.game_rooms WHERE room_code = 'END002';
  SELECT id INTO v_over_empty FROM public.game_rooms WHERE room_code = 'END003';
  SELECT id INTO v_fresh_done FROM public.game_rooms WHERE room_code = 'END004';
  SELECT id INTO v_rematch    FROM public.game_rooms WHERE room_code = 'END005';
  SELECT id INTO v_queued     FROM public.game_rooms WHERE room_code = 'END006';
  SELECT id INTO v_building   FROM public.game_rooms WHERE room_code = 'END007';
  SELECT id INTO v_private    FROM public.game_rooms WHERE room_code = 'END008';

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  SELECT r.id, v_host, 'Host', true, 'joined' FROM public.game_rooms r WHERE r.host_user_id = v_host;
  -- A guest at the finished tables: a room that had guests is exactly the
  -- one the week-old sweep leaves alone, and the one this must not.
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_over_done, v_other, 'Other', false, 'finished'),
         (v_private,   v_other, 'Other', false, 'finished');

  INSERT INTO public.room_category_queue (room_id, source_type, category_id, category_name, position)
  VALUES (v_queued, 'category', 'movies', 'Movies', 0);

  -- Seating somebody stamps the room's activity (update_room_activity), so
  -- the stamps each case is about are written last, over whatever the
  -- seats just wrote.
  UPDATE public.game_rooms SET created_at = now() - interval '3 hours', last_activity_at = now() - interval '2 hours',    started_at = now() - interval '2 hours 10 minutes', completed_at = now() - interval '2 hours' WHERE id IN (v_over_done, v_over_empty, v_rematch, v_queued, v_private);
  UPDATE public.game_rooms SET created_at = now() - interval '1 day',   last_activity_at = now() - interval '23 hours',   started_at = now() - interval '23 hours',           completed_at = NULL                        WHERE id = v_over_stuck;
  UPDATE public.game_rooms SET created_at = now() - interval '1 hour',  last_activity_at = now() - interval '10 minutes', started_at = now() - interval '20 minutes',         completed_at = now() - interval '10 minutes' WHERE id = v_fresh_done;
  UPDATE public.game_rooms SET created_at = now() - interval '3 hours', last_activity_at = now() - interval '3 hours',    started_at = NULL,                                  completed_at = NULL                        WHERE id = v_building;

  -- The rule.
  PERFORM pg_temp.must_equal(public.public_room_is_over(r), true,  'completed two hours ago: over')            FROM public.game_rooms r WHERE r.id = v_over_done;
  PERFORM pg_temp.must_equal(public.public_room_is_over(r), true,  'stuck in playing since yesterday: over')   FROM public.game_rooms r WHERE r.id = v_over_stuck;
  PERFORM pg_temp.must_equal(public.public_room_is_over(r), true,  'played out, nothing to play, quiet: over') FROM public.game_rooms r WHERE r.id = v_over_empty;
  PERFORM pg_temp.must_equal(public.public_room_is_over(r), false, 'finished ten minutes ago: the table may still rematch') FROM public.game_rooms r WHERE r.id = v_fresh_done;
  PERFORM pg_temp.must_equal(public.public_room_is_over(r), false, 'waiting with a category: the next game')  FROM public.game_rooms r WHERE r.id = v_rematch;
  PERFORM pg_temp.must_equal(public.public_room_is_over(r), false, 'waiting with a queued round: the next game') FROM public.game_rooms r WHERE r.id = v_queued;
  PERFORM pg_temp.must_equal(public.public_room_is_over(r), false, 'never played: not over, however quiet')   FROM public.game_rooms r WHERE r.id = v_building;
  PERFORM pg_temp.must_equal(public.public_room_is_over(r), false, 'a private room is never over')           FROM public.game_rooms r WHERE r.id = v_private;

  -- The listing refuses an over room before anything sweeps it.
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_other);
  SELECT string_agg(l.room_code, ',' ORDER BY l.room_code) INTO listed
    FROM public.public_rooms(100) l WHERE l.host_user_id = v_host;
  PERFORM pg_temp.must_equal(listed, 'END005,END006,END007',
    'the Public tab lists the rematch, the queued and the building rooms, and none that is over');

  -- The sweep, as an ordinary signed-in player who owns none of these rooms.
  SELECT public.sweep_ended_public_rooms() INTO n;
  PERFORM pg_temp.must_equal(n, 3, 'the sweep closes exactly the three over rooms');
  RESET ROLE;

  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.game_rooms
      WHERE id IN (v_over_done, v_over_stuck, v_over_empty)
        AND status::text = 'cancelled' AND is_archived IS TRUE),
    3::bigint, 'each of them is cancelled and archived');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.game_rooms
      WHERE id IN (v_fresh_done, v_rematch, v_queued, v_building, v_private)
        AND status::text <> 'cancelled' AND is_archived IS NOT TRUE),
    5::bigint, 'every other room is untouched, the private one among them');

  -- Running it again finds nothing: closed rooms are not closed twice.
  SELECT public.sweep_ended_public_rooms() INTO n;
  PERFORM pg_temp.must_equal(n, 0, 'a second sweep is a no-op');

  -- The rounds stay: archived, not deleted.
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_over_done),
    2::bigint, 'an archived room keeps its seats');

  DELETE FROM public.game_rooms WHERE host_user_id = v_host;
END $$;
