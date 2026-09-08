-- Room and roster visibility, executed rather than reviewed.
--
-- "Anyone can view active rooms" / "Anyone can view room participants"
-- (20251226102356_...sql) were FOR SELECT USING (true) from the very first
-- migration for these tables, and nothing ever narrowed them — even after
-- 20260922100000_public_rooms.sql built a "the room id is the secret" model
-- on top for private rooms. 20261016100000_narrow_room_visibility.sql closes
-- that. These assertions are the regression guard: a room and its roster
-- must be visible only to the people who actually belong there (plus, for
-- the room row itself, anyone once its host has published it), and the
-- "clear unread activity" full-row UPDATE grant must be gone in favour of a
-- function that can only ever touch that one column.
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

-- The shim (00-supabase-shim.sql) only replicates Supabase's default-privilege
-- bootstrap for FUNCTIONS, not tables — real Supabase grants anon/authenticated
-- base table privileges once per project, outside any migration this repo
-- carries. Without granting the same base privileges here, every assertion
-- below would "pass" whether RLS actually rejected the row or the role simply
-- had no table privilege at all to begin with — indistinguishable from outside
-- the error message, and proving nothing. Same precedent as 13-public-rooms.sql.
GRANT SELECT ON public.game_rooms TO anon, authenticated;
GRANT SELECT, UPDATE ON public.game_rooms TO authenticated;
GRANT SELECT ON public.room_participants TO anon, authenticated;

-- ── privilege posture: mark_room_activity_read ──────────────────────────────

DO $$
BEGIN
  PERFORM pg_temp.must_equal(
    has_function_privilege('anon', 'public.mark_room_activity_read(uuid)', 'EXECUTE'),
    false, 'anon cannot call mark_room_activity_read');
  PERFORM pg_temp.must_equal(
    has_function_privilege('authenticated', 'public.mark_room_activity_read(uuid)', 'EXECUTE'),
    true, 'a signed-in caller can still call mark_room_activity_read');
END $$;

-- ── who can see a room and its roster ───────────────────────────────────────

DO $$
DECLARE
  v_host     uuid := 'de000000-0000-0000-0000-000000000001';
  v_friend   uuid := 'de000000-0000-0000-0000-000000000002';
  v_stranger uuid := 'de000000-0000-0000-0000-000000000003';
  v_priv uuid;
  v_pub  uuid;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host,     'host@vis.test'),
    (v_friend,   'friend@vis.test'),
    (v_stranger, 'stranger@vis.test')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host'), (v_friend, 'Friend'), (v_stranger, 'Stranger')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  INSERT INTO public.game_rooms (room_code, host_user_id, room_name, status, is_public, has_unread_activity)
  VALUES ('VISPRV', v_host, 'The quiet one', 'waiting', false, true)
  RETURNING id INTO v_priv;

  INSERT INTO public.game_rooms (room_code, host_user_id, room_name, status, is_public)
  VALUES ('VISPUB', v_host, 'The published one', 'waiting', true)
  RETURNING id INTO v_pub;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status) VALUES
    (v_priv, v_host,   'Host',   true,  'joined'),
    (v_priv, v_friend, 'Friend', false, 'joined'),
    (v_pub,  v_host,   'Host',   true,  'joined');

  -- A caller with no session at all (the public anon key, nobody signed in)
  -- sees neither room's roster, and only the room row that was published.
  SET LOCAL ROLE anon;
  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.game_rooms WHERE id = v_priv),
    0::bigint, 'an anonymous caller cannot see a private room');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.game_rooms WHERE id = v_pub),
    1::bigint, 'an anonymous caller can see a room its host published');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_priv),
    0::bigint, 'an anonymous caller cannot see a private roster');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_pub),
    0::bigint, 'an anonymous caller cannot see a published room''s roster either — only the room itself is public');
  RESET ROLE;

  -- A signed-in stranger with no relationship to either room is in exactly
  -- the same position as the anonymous caller — being logged in is not, on
  -- its own, an invitation to any particular room.
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_stranger);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.game_rooms WHERE id = v_priv),
    0::bigint, 'a signed-in stranger cannot see a private room they were never seated in');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_priv),
    0::bigint, 'a signed-in stranger cannot see a private roster');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_pub),
    0::bigint, 'a signed-in stranger cannot see a published room''s roster');

  -- A seated participant (not the host) sees the room and its full roster.
  PERFORM pg_temp.as_user(v_friend);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.game_rooms WHERE id = v_priv),
    1::bigint, 'a seated participant sees their own private room');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_priv),
    2::bigint, 'a seated participant sees the whole roster, not just their own row');

  -- The host sees their own room and roster the same way.
  PERFORM pg_temp.as_user(v_host);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.game_rooms WHERE id = v_priv),
    1::bigint, 'the host sees their own private room');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_priv),
    2::bigint, 'the host sees the whole roster');

  -- The full-row "clear unread activity" grant is gone: a seated participant
  -- who is not the host cannot rewrite the room's status through it (or at
  -- all — only the host-update policy remains, and it is host-scoped). RLS
  -- filters this to zero matched rows rather than raising, so the assertion
  -- is on the row's state afterward, not on an exception.
  PERFORM pg_temp.as_user(v_friend);
  UPDATE public.game_rooms SET status = 'cancelled' WHERE id = v_priv;
  PERFORM pg_temp.must_equal(
    (SELECT status FROM public.game_rooms WHERE id = v_priv),
    'waiting', 'a non-host participant''s update touches zero rows, not the room''s status');

  -- mark_room_activity_read only ever does the one thing it is named for,
  -- and only for a room the caller is actually seated in. Read the result
  -- back as the friend (who can actually see the room) rather than as the
  -- stranger — the stranger's own SELECT is correctly hidden by the same
  -- fix, and would read as NULL regardless of whether the flag changed.
  PERFORM pg_temp.as_user(v_stranger);
  PERFORM public.mark_room_activity_read(v_priv);
  PERFORM pg_temp.as_user(v_friend);
  PERFORM pg_temp.must_equal(
    (SELECT has_unread_activity FROM public.game_rooms WHERE id = v_priv),
    true, 'a stranger calling mark_room_activity_read changes nothing');

  PERFORM pg_temp.as_user(v_friend);
  PERFORM public.mark_room_activity_read(v_priv);
  PERFORM pg_temp.must_equal(
    (SELECT has_unread_activity FROM public.game_rooms WHERE id = v_priv),
    false, 'a seated participant can clear the room''s unread flag');

  RESET ROLE;
END $$;

\echo 'ok: room and roster visibility is scoped to who actually belongs there'
