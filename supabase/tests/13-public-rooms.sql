-- Public rooms and the host's permission to enter one, executed rather than
-- reviewed.
--
-- The whole feature rests on one claim: publishing a room shows it to
-- everyone WITHOUT opening it to everyone. That claim is only true if a
-- stranger cannot write themselves a seat, so the assertions below spend
-- most of their time on the participants policy rather than on the happy
-- path — the happy path is the part that would have been noticed.
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
     AND p.proname IN ('public_rooms', 'request_room_join', 'respond_room_join')
     AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'anon can call: % -- revoke FROM PUBLIC, anon', bad;
  END IF;
  RAISE NOTICE 'ok: no public-room RPC is reachable by anon';
END $$;

DO $$
DECLARE n bigint;
BEGIN
  -- A client that could write this table could approve itself into any
  -- room, which is the entire gate.
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'room_join_requests'
     AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  PERFORM pg_temp.must_equal(n, 0::bigint, 'no client write policies on room_join_requests');
END $$;

-- Supabase grants its client roles table privileges; this shim does not.
-- Without them every insert below is refused for lack of a GRANT, and the
-- gate would look airtight even if the policy were wide open — the failing
-- assertion has to be the policy's doing.
GRANT SELECT, INSERT ON public.room_participants TO authenticated;
GRANT SELECT ON public.game_rooms TO authenticated;
GRANT SELECT ON public.room_join_requests TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.game_invitations TO authenticated;

-- ── the gate ───────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_host    uuid := 'bc000000-0000-0000-0000-00000000000a';
  v_guest   uuid := 'bc000000-0000-0000-0000-00000000000b';
  v_friend  uuid := 'bc000000-0000-0000-0000-00000000000c';
  v_pub  uuid;
  v_priv uuid;
  v_req  uuid;
  v_out  text;
  n bigint;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host,   'host@pub.test'),
    (v_guest,  'guest@pub.test'),
    (v_friend, 'friend@pub.test')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host'), (v_guest, 'Guest'), (v_friend, 'Friend')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  INSERT INTO public.game_rooms (room_code, host_user_id, room_name, status, is_public)
  VALUES ('PUBLIC', v_host, 'The published one', 'waiting', true)
  RETURNING id INTO v_pub;

  INSERT INTO public.game_rooms (room_code, host_user_id, room_name, status, is_public)
  VALUES ('PRIVAT', v_host, 'The quiet one', 'waiting', false)
  RETURNING id INTO v_priv;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_pub, v_host, 'Host', true, 'joined'),
         (v_priv, v_host, 'Host', true, 'joined');

  -- An old room predating the flag is private, not published.
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.game_rooms WHERE is_public AND room_code = 'PRIVAT'),
    0::bigint, 'a room created without the switch is private');

  SET LOCAL ROLE authenticated;

  -- A stranger cannot seat themselves in a published room…
  PERFORM pg_temp.as_user(v_guest);
  PERFORM pg_temp.must_fail(format(
    $q$INSERT INTO public.room_participants (room_id, user_id, nickname, status)
       VALUES (%L, %L, 'Guest', 'joined')$q$, v_pub, v_guest),
    'a stranger cannot write themselves into a published room');

  -- …but a code is still an invitation, so a private room is unchanged.
  INSERT INTO public.room_participants (room_id, user_id, nickname, status)
  VALUES (v_priv, v_guest, 'Guest', 'joined');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_priv AND user_id = v_guest),
    1::bigint, 'a private room still lets anyone with its id in');

  -- Asking is what a stranger can do.
  v_out := public.request_room_join(v_pub);
  PERFORM pg_temp.must_equal(v_out, 'pending', 'the ask lands as pending');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_pub AND user_id = v_guest),
    0::bigint, 'asking does not seat anyone');

  -- Asking twice is the same one ask, not a way to spam the host's lobby.
  v_out := public.request_room_join(v_pub);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_join_requests WHERE room_id = v_pub AND user_id = v_guest),
    1::bigint, 'a second ask reuses the first row');

  -- The host was told. Read as the owner of the box: notifications are
  -- owner-only by policy, so counting the host's mail while acting as the
  -- guest answers zero whether or not it was ever written.
  SET LOCAL ROLE postgres;
  SELECT count(*) INTO n FROM public.notifications
   WHERE user_id = v_host AND type = 'room_join_request';
  SET LOCAL ROLE authenticated;
  IF n < 1 THEN RAISE EXCEPTION 'ASSERTION FAILED: the host was not notified'; END IF;
  RAISE NOTICE 'ok: the host is notified of an ask';

  -- Nobody but the host answers it.
  SELECT id INTO v_req FROM public.room_join_requests
   WHERE room_id = v_pub AND user_id = v_guest;
  PERFORM pg_temp.must_fail(format('SELECT public.respond_room_join(%L, true)', v_req),
    'the asker cannot approve their own request');

  PERFORM pg_temp.as_user(v_friend);
  PERFORM pg_temp.must_fail(format('SELECT public.respond_room_join(%L, true)', v_req),
    'a bystander cannot approve someone else in');

  -- The host can, and that is what seats them.
  PERFORM pg_temp.as_user(v_host);
  v_out := public.respond_room_join(v_req, true);
  PERFORM pg_temp.must_equal(v_out, 'approved', 'the host approves');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_pub AND user_id = v_guest),
    1::bigint, 'approval seats the asker');

  SET LOCAL ROLE postgres;
  SELECT count(*) INTO n FROM public.notifications
   WHERE user_id = v_guest AND type = 'room_join_approved';
  SET LOCAL ROLE authenticated;
  IF n < 1 THEN RAISE EXCEPTION 'ASSERTION FAILED: the asker was not told'; END IF;
  RAISE NOTICE 'ok: the asker is told they are in';

  -- A declined ask leaves the room shut.
  PERFORM pg_temp.as_user(v_friend);
  v_out := public.request_room_join(v_pub);
  SELECT id INTO v_req FROM public.room_join_requests
   WHERE room_id = v_pub AND user_id = v_friend;
  PERFORM pg_temp.as_user(v_host);
  PERFORM public.respond_room_join(v_req, false);
  PERFORM pg_temp.as_user(v_friend);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_pub AND user_id = v_friend),
    0::bigint, 'a declined ask seats nobody');
  PERFORM pg_temp.must_fail(format(
    $q$INSERT INTO public.room_participants (room_id, user_id, nickname, status)
       VALUES (%L, %L, 'Friend', 'joined')$q$, v_pub, v_friend),
    'a declined asker still cannot write themselves in');

  -- Asking again after a no is allowed — it is a knock, not a ban.
  v_out := public.request_room_join(v_pub);
  PERFORM pg_temp.must_equal(v_out, 'pending', 'a declined asker may knock again');

  -- The private room refuses the ritual outright: it is joined by code.
  PERFORM pg_temp.must_fail(format('SELECT public.request_room_join(%L)', v_priv),
    'a private room cannot be asked into');

  -- The listing shows the published room and not the quiet one, with the
  -- caller's own standing in it.
  PERFORM pg_temp.as_user(v_guest);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.public_rooms(40) WHERE room_code = 'PRIVAT'),
    0::bigint, 'the listing never carries a private room');
  PERFORM pg_temp.must_equal(
    (SELECT my_state FROM public.public_rooms(40) WHERE room_code = 'PUBLIC'),
    'joined', 'the listing knows the caller is already in');
  PERFORM pg_temp.must_equal(
    (SELECT player_count FROM public.public_rooms(40) WHERE room_code = 'PUBLIC'),
    2, 'the listing counts the seats taken');

  PERFORM pg_temp.as_user(v_host);
  PERFORM pg_temp.must_equal(
    (SELECT my_state FROM public.public_rooms(40) WHERE room_code = 'PUBLIC'),
    'host', 'the listing knows its host');

  RESET ROLE;
  PERFORM pg_temp.as_user(NULL);
END $$;

-- ── an invite is the yes, given earlier ────────────────────────────────────

DO $$
DECLARE
  v_host  uuid := 'bc000000-0000-0000-0000-00000000001a';
  v_asked uuid := 'bc000000-0000-0000-0000-00000000001b';
  v_room uuid;
  v_out  text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'host2@pub.test'), (v_asked, 'asked@pub.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host2'), (v_asked, 'Asked')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public)
  VALUES ('PUBIN2', v_host, 'waiting', true) RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_room, v_host, 'Host2', true, 'joined');

  INSERT INTO public.game_invitations (room_id, sender_id, receiver_id, status)
  VALUES (v_room, v_host, v_asked, 'pending');

  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_asked);

  -- Someone the host asked in does not queue behind a permission they have
  -- already been given.
  v_out := public.request_room_join(v_room);
  PERFORM pg_temp.must_equal(v_out, 'joined', 'an invited player walks straight in');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_join_requests WHERE room_id = v_room AND user_id = v_asked),
    0::bigint, 'and never files a request');

  RESET ROLE;
  PERFORM pg_temp.as_user(NULL);
END $$;

DO $$ BEGIN RAISE NOTICE 'all public-room assertions passed'; END $$;
