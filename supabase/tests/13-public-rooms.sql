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
     AND p.proname IN ('public_rooms', 'request_room_join', 'respond_room_join',
                       'block_room_join', 'tb_set_team_icon')
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
  -- room, which is the entire gate. The one carve-out is the asker taking
  -- back their OWN still-pending ask (20260926100000): a DELETE that can
  -- only un-ask, never answer — so inserts and updates stay at zero, and
  -- every delete policy must be pinned to auth.uid() + pending.
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'room_join_requests'
     AND cmd IN ('INSERT', 'UPDATE', 'ALL');
  PERFORM pg_temp.must_equal(n, 0::bigint, 'no client insert/update policies on room_join_requests');
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'room_join_requests'
     AND cmd = 'DELETE'
     AND NOT (qual LIKE '%auth.uid()%' AND qual LIKE '%pending%');
  PERFORM pg_temp.must_equal(n, 0::bigint,
    'every delete policy on room_join_requests is the asker''s own pending withdraw');
END $$;

-- Supabase grants its client roles table privileges; this shim does not.
-- Without them every insert below is refused for lack of a GRANT, and the
-- gate would look airtight even if the policy were wide open — the failing
-- assertion has to be the policy's doing.
GRANT SELECT, INSERT ON public.room_participants TO authenticated;
GRANT SELECT ON public.game_rooms TO authenticated;
GRANT SELECT, DELETE ON public.room_join_requests TO authenticated;
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

  -- This block exercises the knock-and-approve flow, which is now the
  -- opt-in path: a public room is OPEN by default (20260930100000), so the
  -- room that tests approval has to ask for it with requires_approval.
  INSERT INTO public.game_rooms (room_code, host_user_id, room_name, status, is_public, requires_approval)
  VALUES ('PUBLIC', v_host, 'The published one', 'waiting', true, true)
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

-- ── a block sticks, and leaving spends the yes ─────────────────────────────

DO $$
DECLARE
  v_host  uuid := 'bc000000-0000-0000-0000-00000000002a';
  v_pest  uuid := 'bc000000-0000-0000-0000-00000000002b';
  v_guest uuid := 'bc000000-0000-0000-0000-00000000002c';
  v_room uuid;
  v_req  uuid;
  v_out  text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'host3@pub.test'), (v_pest, 'pest@pub.test'), (v_guest, 'guest3@pub.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host3'), (v_pest, 'Pest'), (v_guest, 'Guest3')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  -- Approval-required, so the knock/block/approve flow below has a request
  -- to act on rather than an instant seat (a public room is open by default).
  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public, requires_approval)
  VALUES ('PUBIN3', v_host, 'waiting', true, true) RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_room, v_host, 'Host3', true, 'joined');

  SET LOCAL ROLE authenticated;

  -- Somebody knocks and is blocked rather than declined.
  PERFORM pg_temp.as_user(v_pest);
  PERFORM public.request_room_join(v_room);
  SELECT id INTO v_req FROM public.room_join_requests
   WHERE room_id = v_room AND user_id = v_pest;

  PERFORM pg_temp.as_user(v_guest);
  PERFORM pg_temp.must_fail(format('SELECT public.block_room_join(%L)', v_req),
    'a bystander cannot block somebody out of a room they do not host');

  PERFORM pg_temp.as_user(v_host);
  PERFORM pg_temp.must_equal(public.block_room_join(v_req), 'blocked', 'the host blocks');

  -- The block is the whole point: no second knock, and no room to knock on.
  PERFORM pg_temp.as_user(v_pest);
  PERFORM pg_temp.must_equal(public.request_room_join(v_room), 'blocked',
    'a blocked player cannot ask again');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.public_rooms(40) WHERE id = v_room),
    0::bigint, 'a blocked player cannot even see the room');
  PERFORM pg_temp.must_fail(format(
    $q$INSERT INTO public.room_participants (room_id, user_id, nickname, status)
       VALUES (%L, %L, 'Pest', 'joined')$q$, v_room, v_pest),
    'and still cannot write themselves in');

  -- Everyone else sees it exactly as before.
  PERFORM pg_temp.as_user(v_guest);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.public_rooms(40) WHERE id = v_room),
    1::bigint, 'the block is one player, not the room');

  -- Approved, then removed: the permission is spent, so they ask again.
  v_out := public.request_room_join(v_room);
  SELECT id INTO v_req FROM public.room_join_requests
   WHERE room_id = v_room AND user_id = v_guest;
  PERFORM pg_temp.as_user(v_host);
  PERFORM public.respond_room_join(v_req, true);
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_room AND user_id = v_guest),
    1::bigint, 'approved and seated');

  PERFORM public.lobby_manage_seat(v_room, v_guest, 'remove');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_join_requests WHERE room_id = v_room AND user_id = v_guest),
    0::bigint, 'removing them spends the approval');

  PERFORM pg_temp.as_user(v_guest);
  PERFORM pg_temp.must_fail(format(
    $q$INSERT INTO public.room_participants (room_id, user_id, nickname, status)
       VALUES (%L, %L, 'Guest3', 'joined')$q$, v_room, v_guest),
    'a removed player cannot walk back in on the old approval');
  PERFORM pg_temp.must_equal(public.request_room_join(v_room), 'pending',
    'a removed player knocks again');

  RESET ROLE;
  PERFORM pg_temp.as_user(NULL);
END $$;

-- ── the arena's crests belong to its captains ──────────────────────────────

DO $$
DECLARE
  v_host uuid := 'bc000000-0000-0000-0000-00000000003a';
  v_cap  uuid := 'bc000000-0000-0000-0000-00000000003b';
  v_grunt uuid := 'bc000000-0000-0000-0000-00000000003c';
  v_room uuid;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'host4@pub.test'), (v_cap, 'cap@pub.test'), (v_grunt, 'grunt@pub.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host4'), (v_cap, 'Cap'), (v_grunt, 'Grunt')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  INSERT INTO public.game_rooms (room_code, host_user_id, status, game_type_key)
  VALUES ('ARENA1', v_host, 'waiting', 'team_battle') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, team, is_captain)
  VALUES (v_room, v_host,  'Host4', true,  'joined', 'a', false),
         (v_room, v_cap,   'Cap',   false, 'joined', 'b', true),
         (v_room, v_grunt, 'Grunt', false, 'joined', 'b', false);

  SET LOCAL ROLE authenticated;

  -- The elected captain of B dresses B.
  PERFORM pg_temp.as_user(v_cap);
  PERFORM public.tb_set_team_icon(v_room, 'b', 'https://icons/rocket.png');
  PERFORM pg_temp.must_equal(
    (SELECT team_b_icon FROM public.game_rooms WHERE id = v_room),
    'https://icons/rocket.png', 'the captain sets their own side''s crest');

  -- And nobody else's.
  PERFORM pg_temp.must_fail(format(
    'SELECT public.tb_set_team_icon(%L, %L, %L)', v_room, 'a', 'https://icons/x.png'),
    'a captain cannot redress the other side');

  -- A player who is not the captain has no say.
  PERFORM pg_temp.as_user(v_grunt);
  PERFORM pg_temp.must_fail(format(
    'SELECT public.tb_set_team_icon(%L, %L, %L)', v_room, 'b', 'https://icons/x.png'),
    'a team-mate who was not elected cannot');

  -- The host dresses their OWN side: nobody on A has been voted in, so
  -- its captain is its earliest-joined human, which is the host.
  PERFORM pg_temp.as_user(v_host);
  PERFORM public.tb_set_team_icon(v_room, 'a', 'https://icons/anchor.png');
  PERFORM pg_temp.must_equal(
    (SELECT team_a_icon FROM public.game_rooms WHERE id = v_room),
    'https://icons/anchor.png', 'the host dresses the side they lead by default');

  -- …and never the other one (20260925100000): hosting is not captaining.
  PERFORM pg_temp.must_fail(format(
    'SELECT public.tb_set_team_icon(%L, %L, %L)', v_room, 'b', 'https://icons/x.png'),
    'the host cannot redress the other side');
  PERFORM pg_temp.must_equal(
    (SELECT team_b_icon FROM public.game_rooms WHERE id = v_room),
    'https://icons/rocket.png', 'B keeps the crest its captain chose');

  RESET ROLE;
  PERFORM pg_temp.as_user(NULL);
END $$;

-- ── the host names the side an approved player lands on ────────────────────

DO $$
DECLARE
  v_host  uuid := 'bc000000-0000-0000-0000-00000000004a';
  v_asker uuid := 'bc000000-0000-0000-0000-00000000004b';
  v_room uuid;
  v_req  uuid;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'host5@pub.test'), (v_asker, 'asker5@pub.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host5'), (v_asker, 'Asker5')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  -- Approval-required so the ask files a request the host then answers onto a
  -- team (a public room is open by default, which would seat with no request).
  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public, requires_approval, game_type_key)
  VALUES ('ARENA2', v_host, 'waiting', true, true, 'team_battle') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, team)
  VALUES (v_room, v_host, 'Host5', true, 'joined', 'a');

  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_asker);
  PERFORM public.request_room_join(v_room);
  SELECT id INTO v_req FROM public.room_join_requests
   WHERE room_id = v_room AND user_id = v_asker;

  PERFORM pg_temp.as_user(v_host);
  PERFORM pg_temp.must_fail(format('SELECT public.respond_room_join(%L, true, %L)', v_req, 'c'),
    'a side has to be a or b');
  PERFORM public.respond_room_join(v_req, true, 'b');
  PERFORM pg_temp.must_equal(
    (SELECT team FROM public.room_participants WHERE room_id = v_room AND user_id = v_asker),
    'b', 'an approved player lands on the side the host named');

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

  -- Approval-required, so the invite (not the open door) is what walks the
  -- asked player straight in — which is the branch this block exercises.
  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public, requires_approval)
  VALUES ('PUBIN2', v_host, 'waiting', true, true) RETURNING id INTO v_room;
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

-- ── a pending ask is the asker's to take back — and only a pending one ────

DO $$
DECLARE
  v_host uuid := 'bc000000-0000-0000-0000-00000000003a';
  v_one  uuid := 'bc000000-0000-0000-0000-00000000003b';
  v_two  uuid := 'bc000000-0000-0000-0000-00000000003c';
  v_room uuid;
  v_out  text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'host3@pub.test'), (v_one, 'one@pub.test'), (v_two, 'two@pub.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host3'), (v_one, 'One'), (v_two, 'Two')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  -- Approval-required, so the two asks land as pending rows to withdraw
  -- (an open room would seat them and file nothing to take back).
  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public, requires_approval)
  VALUES ('PUBWD1', v_host, 'waiting', true, true) RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_room, v_host, 'Host3', true, 'joined');

  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_one);
  v_out := public.request_room_join(v_room);
  PERFORM pg_temp.as_user(v_two);
  v_out := public.request_room_join(v_room);

  -- One's withdraw removes One's row and cannot touch Two's, however the
  -- delete is phrased: RLS matches only the asker's own pending rows.
  PERFORM pg_temp.as_user(v_one);
  DELETE FROM public.room_join_requests WHERE room_id = v_room;
  RESET ROLE;
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_join_requests WHERE room_id = v_room AND user_id = v_one),
    0::bigint, 'the asker takes a pending ask back');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_join_requests WHERE room_id = v_room AND user_id = v_two),
    1::bigint, 'and cannot take back anyone else''s');

  -- An answered request keeps its answer: a decline is not erasable to ask
  -- again as if it never happened through this door.
  UPDATE public.room_join_requests
     SET status = 'declined', responded_at = now()
   WHERE room_id = v_room AND user_id = v_two;
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_two);
  DELETE FROM public.room_join_requests WHERE room_id = v_room AND user_id = v_two;
  RESET ROLE;
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_join_requests WHERE room_id = v_room AND user_id = v_two),
    1::bigint, 'an answered request keeps its answer');

  PERFORM pg_temp.as_user(NULL);
END $$;

-- ── an open room seats you; a guarded one still asks ──────────────────────
--
-- The whole point of the new column, executed. Publishing a room shows it to
-- everyone; whether that also OPENS it is the host's choice, and the default
-- is open. The claim worth testing is that the choice is the server's to
-- enforce — not the button's.

DO $$
DECLARE
  v_host uuid := 'bc000000-0000-0000-0000-00000000004a';
  v_open uuid := 'bc000000-0000-0000-0000-00000000004b';
  v_ask  uuid := 'bc000000-0000-0000-0000-00000000004c';
  v_room uuid;
  v_shut uuid;
  v_priv uuid;
  v_out  text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'host4@pub.test'), (v_open, 'open@pub.test'), (v_ask, 'ask@pub.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host4'), (v_open, 'Walker'), (v_ask, 'Knocker')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  -- Default: a published room is open.
  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public)
  VALUES ('PUBOP1', v_host, 'waiting', true) RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_room, v_host, 'Host4', true, 'joined');
  PERFORM pg_temp.must_equal(
    (SELECT requires_approval FROM public.game_rooms WHERE id = v_room),
    false, 'a published room is open unless its host says otherwise');

  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_open);
  v_out := public.request_room_join(v_room);
  RESET ROLE;
  PERFORM pg_temp.must_equal(v_out, 'joined', 'an open room seats the caller');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants
      WHERE room_id = v_room AND user_id = v_open AND status = 'joined'),
    1::bigint, 'and the seat is real');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_join_requests WHERE room_id = v_room),
    0::bigint, 'with nothing left waiting on the host');

  -- The same room with the switch on: back to knocking.
  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public, requires_approval)
  VALUES ('PUBAS1', v_host, 'waiting', true, true) RETURNING id INTO v_shut;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_shut, v_host, 'Host4', true, 'joined');

  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_ask);
  v_out := public.request_room_join(v_shut);
  RESET ROLE;
  PERFORM pg_temp.must_equal(v_out, 'pending', 'a guarded room still asks');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.room_participants WHERE room_id = v_shut AND user_id = v_ask),
    0::bigint, 'and seats nobody until the host says yes');

  -- Open is about PUBLISHED rooms. A private room is joined with its code,
  -- and this door stays shut whatever the column says.
  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public, requires_approval)
  VALUES ('PRVOP1', v_host, 'waiting', false, false) RETURNING id INTO v_priv;
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_open);
  PERFORM pg_temp.must_fail(
    format('SELECT public.request_room_join(%L)', v_priv),
    'an open flag does not publish a private room');
  RESET ROLE;

  -- A full room turns everyone away, however friendly its door.
  UPDATE public.game_rooms SET max_players = 2 WHERE id = v_room;
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_ask);
  PERFORM pg_temp.must_fail(
    format('SELECT public.request_room_join(%L)', v_room),
    'a full open room seats nobody');
  RESET ROLE;

  PERFORM pg_temp.as_user(NULL);
END $$;

DO $$ BEGIN RAISE NOTICE 'all public-room assertions passed'; END $$;
