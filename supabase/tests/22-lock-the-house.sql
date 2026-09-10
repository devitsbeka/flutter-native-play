-- The house is locked, executed rather than reviewed (20261106100000).
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

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ok: % (%)', label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'ASSERTION FAILED: % — it succeeded', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

CREATE OR REPLACE FUNCTION pg_temp.coins_of(u uuid) RETURNS integer
LANGUAGE sql AS $$ SELECT coins FROM public.profiles WHERE user_id = u; $$;

-- ── policies ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_rooms'
              AND policyname = 'Participants can clear unread activity') THEN
    RAISE EXCEPTION 'participants can still UPDATE game_rooms';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'economy_config'
              AND policyname LIKE 'Authenticated users can%') THEN
    RAISE EXCEPTION 'any signed-in user can still write economy_config';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE tablename IN ('shop_products', 'iap_products')
                AND policyname LIKE 'Authenticated users can manage%') THEN
    RAISE EXCEPTION 'any signed-in user can still manage the product tables';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'economy_config'
                  AND policyname = 'Admins manage economy config') THEN
    RAISE EXCEPTION 'admins have no policy on economy_config';
  END IF;
  RAISE NOTICE 'ok: the room, the prices and the products are no longer anybody''s to write';
END $$;

-- ── fixtures ───────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email) VALUES
  ('22000000-0000-0000-0000-00000000000a','lock-host@test'),
  ('22000000-0000-0000-0000-00000000000b','lock-guest@test'),
  ('22000000-0000-0000-0000-00000000000c','lock-blocked@test'),
  ('22000000-0000-0000-0000-00000000000d','lock-third@test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('22000000-0000-0000-0000-00000000000a','Host', 2000, 0),
  ('22000000-0000-0000-0000-00000000000b','Guest', 2000, 0),
  ('22000000-0000-0000-0000-00000000000c','Blocked', 2000, 0),
  ('22000000-0000-0000-0000-00000000000d','Third', 2000, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 2000, gems = 0;
DELETE FROM public.game_rooms WHERE host_user_id = '22000000-0000-0000-0000-00000000000a';
DELETE FROM public.user_blocks WHERE blocker_id = '22000000-0000-0000-0000-00000000000a';
DELETE FROM public.currency_grants WHERE user_id IN (
  '22000000-0000-0000-0000-00000000000a', '22000000-0000-0000-0000-00000000000b',
  '22000000-0000-0000-0000-00000000000c', '22000000-0000-0000-0000-00000000000d');
DELETE FROM public.vip_subscriptions WHERE user_id = '22000000-0000-0000-0000-00000000000d';
DELETE FROM public.iap_events WHERE user_id = '22000000-0000-0000-0000-00000000000d';

DO $$
DECLARE
  host    uuid := '22000000-0000-0000-0000-00000000000a';
  guest   uuid := '22000000-0000-0000-0000-00000000000b';
  blocked uuid := '22000000-0000-0000-0000-00000000000c';
  third   uuid := '22000000-0000-0000-0000-00000000000d';
  v_room uuid;
  v_req  uuid;
  v_row  record;
  v_n    integer;
BEGIN
  -- ── 1. the unread dot ───────────────────────────────────────────────────
  INSERT INTO public.game_rooms (room_code, host_user_id, status, is_public, requires_approval, max_players, has_unread_activity)
  VALUES ('LOCK01', host, 'waiting', true, true, 2, true) RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host)
  VALUES (v_room, host, 'Host', true), (v_room, guest, 'Guest', false);

  PERFORM pg_temp.as_user(third);
  PERFORM public.clear_room_unread(v_room);
  PERFORM pg_temp.must_equal((SELECT has_unread_activity FROM public.game_rooms WHERE id = v_room), true,
    'a stranger cannot clear the dot');
  PERFORM pg_temp.as_user(guest);
  PERFORM public.clear_room_unread(v_room);
  PERFORM pg_temp.must_equal((SELECT has_unread_activity FROM public.game_rooms WHERE id = v_room), false,
    'a participant can');

  -- ── 3. only player rewards ──────────────────────────────────────────────
  PERFORM pg_temp.as_user(guest);
  PERFORM pg_temp.must_fail(
    'SELECT * FROM public.credit_gameplay_reward(''room_prize'', 100, 0, NULL)',
    'room_prize cannot be claimed from a client');
  PERFORM pg_temp.must_fail(
    'SELECT * FROM public.credit_gameplay_reward(''king_win'', 100, 0, NULL)',
    'nor king_win');
  PERFORM pg_temp.must_fail(
    'SELECT * FROM public.credit_gameplay_reward(''team_battle_win'', 100, 0, NULL)',
    'nor team_battle_win');
  PERFORM pg_temp.must_fail(
    'SELECT * FROM public.credit_gameplay_reward(''streak_milestone'', 100, 0, NULL)',
    'nor streak_milestone');
  PERFORM public.credit_gameplay_reward('spin', 50, 0, NULL);
  PERFORM pg_temp.must_equal(pg_temp.coins_of(guest), 2050, 'a spin still pays');

  -- ── 4. a PRO seat carries no welcome ────────────────────────────────────
  PERFORM pg_temp.as_user(NULL);
  INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at, auto_renew, purchase_platform)
  VALUES (third, 'pro', now() + interval '30 days', false, 'seat');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(third), 2000, 'a seat holder gets no welcome coins');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.currency_grants WHERE user_id = third AND kind = 'pro_welcome'), 0,
    'and no welcome ledger row');

  -- ── 6. a knock asks the block list ──────────────────────────────────────
  INSERT INTO public.user_blocks (blocker_id, blocked_id) VALUES (host, blocked);
  PERFORM pg_temp.as_user(blocked);
  PERFORM pg_temp.must_equal(public.request_room_join(v_room), 'blocked',
    'a blocked player''s knock answers blocked');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.notifications WHERE user_id = host AND type = 'room_join_request'), 0,
    'and the host is not told');

  -- ── 5. a yes needs a seat in a waiting room ─────────────────────────────
  -- Room LOCK01 seats two and both are taken.
  PERFORM pg_temp.as_user(third);
  PERFORM pg_temp.must_fail('SELECT public.request_room_join(''' || v_room || ''')',
    'a full room refuses the knock');
  UPDATE public.game_rooms SET max_players = 3 WHERE id = v_room;
  PERFORM pg_temp.must_equal(public.request_room_join(v_room), 'pending', 'with a seat free, the knock is pending');
  SELECT id INTO v_req FROM public.room_join_requests WHERE room_id = v_room AND user_id = third;

  -- Fill the seat behind the knock, then approve: refused, request still pending.
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host)
  VALUES (v_room, blocked, 'Blocked', false);
  PERFORM pg_temp.as_user(host);
  PERFORM pg_temp.must_fail('SELECT public.respond_room_join(''' || v_req || ''', true, NULL)',
    'approving into a full room is refused');
  PERFORM pg_temp.must_equal(
    (SELECT status FROM public.room_join_requests WHERE id = v_req), 'pending',
    'and the knock stays pending');
  DELETE FROM public.room_participants WHERE room_id = v_room AND user_id = blocked;

  -- A round in progress: refused too.
  UPDATE public.game_rooms SET status = 'playing' WHERE id = v_room;
  PERFORM pg_temp.must_fail('SELECT public.respond_room_join(''' || v_req || ''', true, NULL)',
    'approving into a live round is refused');
  UPDATE public.game_rooms SET status = 'waiting' WHERE id = v_room;
  PERFORM pg_temp.must_equal(public.respond_room_join(v_req, true, NULL), 'approved',
    'back in the lobby with a seat free, the yes seats them');
  PERFORM pg_temp.must_equal(
    (SELECT status::text FROM public.room_participants WHERE room_id = v_room AND user_id = third), 'joined',
    'and they hold the seat');

  -- ── 7. the public list counts the seated, and says whether it asks ──────
  -- An invitation nobody accepted is not a player.
  UPDATE public.game_rooms SET max_players = 10 WHERE id = v_room;
  DELETE FROM public.user_blocks WHERE blocker_id = host AND blocked_id = blocked;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_room, blocked, 'Blocked', false, 'invited');
  PERFORM pg_temp.as_user(guest);
  SELECT * INTO v_row FROM public.public_rooms(40) r WHERE r.id = v_room;
  PERFORM pg_temp.must_equal(v_row.player_count, 3, 'three seated; the invitation is not counted');
  PERFORM pg_temp.must_equal(v_row.requires_approval, true, 'and the list says the room asks first');

  -- A blocked pair does not see each other's rooms.
  INSERT INTO public.user_blocks (blocker_id, blocked_id) VALUES (host, blocked);
  PERFORM pg_temp.as_user(blocked);
  SELECT count(*) INTO v_n FROM public.public_rooms(40) r WHERE r.id = v_room;
  PERFORM pg_temp.must_equal(v_n, 0, 'a blocked player does not see the host''s room');
END $$;

-- ── privilege posture ──────────────────────────────────────────────────────

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('clear_room_unread', 'respond_room_join', 'request_room_join', 'public_rooms', 'credit_gameplay_reward')
     AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'anon can call: % -- revoke FROM PUBLIC, anon', bad;
  END IF;
  RAISE NOTICE 'ok: none of it is reachable by anon';
END $$;
