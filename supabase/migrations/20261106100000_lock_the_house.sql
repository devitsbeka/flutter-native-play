-- Lock the house: the doors an end-to-end audit found standing open.
--
-- Each of these is a place where a signed-in player could do something
-- only the server, the host or an admin should be able to do. None needs a
-- client change to be safe; the client changes that ride along are only
-- so the app keeps doing legitimately what it did.
--
--   1. Any participant could rewrite the whole room row. The policy that
--      let a guest clear the "unread" dot was FOR UPDATE with no column
--      scope, so a guest could publish, cancel, resize or recategorise the
--      host's room. The dot is cleared through a function now.
--   2. Any signed-in user could UPDATE economy_config, shop_products and
--      iap_products - and purchase_power_up and the PRO welcome bundle
--      read their amounts from economy_config. Admins only.
--   3. credit_gameplay_reward accepted every kind with a limits row,
--      including the kinds only server functions pay (room_prize,
--      team_battle_win, king_win, king_question, streak_milestone). Those
--      rows exist to document ceilings, and added up to a daily mint of
--      tens of thousands of coins and a hundred-odd gems from the console.
--      The function takes a player-reward allowlist now.
--   4. grant_subscription_welcome fired for a PRO SEAT too - one Friends
--      PRO purchase paid the full welcome bundle to each of its seat
--      holders, again for every reseat. Seats carry no bundle.
--   5. respond_room_join checked only that the caller was the host: an
--      eleventh player into ten seats, or an approval after Start that
--      walked the guest into a live round. Capacity and status first.
--   6. request_room_join never asked user_blocks, so a blocked pair could
--      end up in one room with the host never shown the knock. And its
--      capacity count included invited and disconnected seats.
--   7. public_rooms counted every participant row as a player, so a host
--      who invited eight friends listed as 9/10 with two faces. Seated
--      only. It also says whether the room asks first (requires_approval),
--      which the card could not tell before.

-- ── 1. The unread dot goes through a function ──────────────────────────────

CREATE OR REPLACE FUNCTION public.clear_room_unread(p_room_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.game_rooms
     SET has_unread_activity = false
   WHERE id = p_room_id
     AND EXISTS (
       SELECT 1 FROM public.room_participants rp
        WHERE rp.room_id = p_room_id AND rp.user_id = auth.uid()
     );
$$;

REVOKE ALL ON FUNCTION public.clear_room_unread(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_room_unread(uuid) TO authenticated;

DROP POLICY IF EXISTS "Participants can clear unread activity" ON public.game_rooms;

-- ── 2. Prices and products are the admins' to edit ─────────────────────────

DROP POLICY IF EXISTS "Authenticated users can update economy config" ON public.economy_config;
DROP POLICY IF EXISTS "Authenticated users can insert economy config" ON public.economy_config;
DROP POLICY IF EXISTS "Admins manage economy config" ON public.economy_config;
CREATE POLICY "Admins manage economy config"
  ON public.economy_config
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can manage shop products" ON public.shop_products;
DROP POLICY IF EXISTS "Admins manage shop products" ON public.shop_products;
CREATE POLICY "Admins manage shop products"
  ON public.shop_products
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can manage iap products" ON public.iap_products;
DROP POLICY IF EXISTS "Admins manage iap products" ON public.iap_products;
CREATE POLICY "Admins manage iap products"
  ON public.iap_products
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 3. Only player rewards can be asked for ────────────────────────────────
--
-- The body is 20260813150000's, with one check added: the kind has to be
-- one a player is allowed to claim. Server-paid kinds keep their limits
-- rows (their payers read nothing from this function), they just cannot
-- be named from a client.

CREATE OR REPLACE FUNCTION public.credit_gameplay_reward(
  p_kind text,
  p_coins integer DEFAULT 0,
  p_gems integer DEFAULT 0,
  p_reference text DEFAULT NULL
)
RETURNS TABLE (new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit   public.currency_grant_limits%ROWTYPE;
  v_day_coins integer;
  v_day_gems  integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_coins < 0 OR p_gems < 0 THEN
    RAISE EXCEPTION 'A reward cannot be negative';
  END IF;

  -- The kinds a player may claim for themselves. Everything else in
  -- currency_grant_limits is paid by a server function that decides the
  -- amount itself (room pots, battle and King payouts, streak milestones,
  -- the PRO welcome) and must not be reachable from here.
  IF p_kind NOT IN (
    'quiz_reward', 'level_up', 'stake_win', 'spin', 'chest',
    'mission', 'ad_reward', 'achievement', 'feed_trivia'
  ) THEN
    RAISE EXCEPTION 'Reward kind % is not a player reward', p_kind;
  END IF;

  IF p_coins = 0 AND p_gems = 0 THEN
    SELECT coins, gems INTO new_coins, new_gems FROM profiles WHERE user_id = v_user_id;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_limit FROM public.currency_grant_limits WHERE kind = p_kind;

  IF v_limit.kind IS NULL THEN
    RAISE EXCEPTION 'Unknown reward kind: %', p_kind;
  END IF;

  IF p_coins > v_limit.max_coins_call OR p_gems > v_limit.max_gems_call THEN
    RAISE EXCEPTION 'Reward of % coins / % gems exceeds the per-award limit for %',
      p_coins, p_gems, p_kind;
  END IF;

  SELECT COALESCE(SUM(coins), 0), COALESCE(SUM(gems), 0)
    INTO v_day_coins, v_day_gems
    FROM public.currency_grants
   WHERE user_id = v_user_id
     AND kind = p_kind
     AND created_at >= date_trunc('day', now());

  IF v_day_coins + p_coins > v_limit.max_coins_day
     OR v_day_gems + p_gems > v_limit.max_gems_day THEN
    RAISE EXCEPTION 'Daily % limit reached', p_kind;
  END IF;

  RETURN QUERY
    SELECT * FROM public.apply_currency_grant(v_user_id, p_kind, p_coins, p_gems, p_reference);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_gameplay_reward(text, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credit_gameplay_reward(text, integer, integer, text) TO authenticated;

-- ── 4. A PRO seat carries no welcome bundle ────────────────────────────────
--
-- 20261102110000's trigger, with one early return: a row written by
-- grant_pro_seat (purchase_platform = 'seat') is somebody else's
-- subscription shared, not a purchase, and pays nothing.

CREATE OR REPLACE FUNCTION public.grant_subscription_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coins   integer;
  v_gems    integer;
  v_claimed integer;
BEGIN
  IF NEW.vip_tier NOT IN ('pro', 'pro_plus') THEN
    RETURN NEW;
  END IF;

  IF NEW.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  -- A seat is a share of a subscription somebody else bought. The buyer's
  -- own row paid the bundle; the seats do not pay it again, and reseating
  -- a seat does not pay it to the next holder.
  IF COALESCE(NEW.purchase_platform, '') = 'seat' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
           (SELECT value::integer FROM public.economy_config
             WHERE id = CASE NEW.vip_tier WHEN 'pro' THEN 'pro_welcome_coins'
                                          ELSE 'pro_plus_welcome_coins' END),
           CASE NEW.vip_tier WHEN 'pro' THEN 25000 ELSE 50000 END),
         COALESCE(
           (SELECT value::integer FROM public.economy_config
             WHERE id = CASE NEW.vip_tier WHEN 'pro' THEN 'pro_welcome_gems'
                                          ELSE 'pro_plus_welcome_gems' END),
           CASE NEW.vip_tier WHEN 'pro' THEN 10 ELSE 20 END)
    INTO v_coins, v_gems;

  IF COALESCE(v_coins, 0) <= 0 AND COALESCE(v_gems, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.iap_events
    (event_id, event_type, user_id, product_id, store, transaction_id, event_at, payload)
  VALUES (
    'welcome:' || NEW.user_id::text || ':' || NEW.vip_tier,
    'SUBSCRIPTION_WELCOME',
    NEW.user_id,
    NEW.apple_product_id,
    NEW.purchase_platform,
    NEW.apple_original_transaction_id,
    now(),
    jsonb_build_object('tier', NEW.vip_tier, 'coins', v_coins, 'gems', v_gems, 'granted_by', 'database')
  )
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
     SET coins = coins + v_coins,
         gems  = gems  + v_gems
   WHERE user_id = NEW.user_id;

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (NEW.user_id, 'pro_welcome', v_coins, v_gems, NEW.vip_tier)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_subscription_welcome() FROM PUBLIC, anon, authenticated;

-- ── 5. A yes needs a seat and a round that has not started ─────────────────

CREATE OR REPLACE FUNCTION public.respond_room_join(
  p_request_id uuid,
  p_approve boolean,
  p_team text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req room_join_requests%ROWTYPE;
  v_room game_rooms%ROWTYPE;
  v_them profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;
  IF p_team IS NOT NULL AND p_team NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'no such team';
  END IF;

  SELECT * INTO v_req FROM room_join_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such request';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = v_req.room_id;
  IF v_room.host_user_id <> v_uid THEN
    RAISE EXCEPTION 'only the host answers this';
  END IF;

  IF p_approve THEN
    -- A round in progress cannot take a new player; the ask stays pending
    -- for the host to answer once the table is back in the lobby.
    IF v_room.status::text <> 'waiting' THEN
      RAISE EXCEPTION 'that round has started';
    END IF;
    -- Seated players only: an invitation nobody accepted and a seat
    -- somebody left are not people at the table.
    IF (SELECT count(*) FROM room_participants rp
         WHERE rp.room_id = v_req.room_id
           AND rp.status::text IN ('joined', 'ready', 'playing'))
         >= COALESCE(v_room.max_players, 10) THEN
      RAISE EXCEPTION 'that room is full';
    END IF;
  END IF;

  UPDATE room_join_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
         responded_at = now()
   WHERE id = p_request_id;

  IF p_approve THEN
    SELECT * INTO v_them FROM profiles WHERE user_id = v_req.user_id;
    INSERT INTO room_participants (room_id, user_id, nickname, avatar_url, country_code, is_host, status, team)
    VALUES (v_req.room_id, v_req.user_id, COALESCE(v_them.nickname, 'Player'), v_them.avatar_url,
            COALESCE(v_them.country_code, 'GE'), false, 'joined', p_team)
    ON CONFLICT (room_id, user_id) DO UPDATE
      SET status = 'joined',
          team = COALESCE(EXCLUDED.team, room_participants.team);
  END IF;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_req.user_id,
    CASE WHEN p_approve THEN 'room_join_approved' ELSE 'room_join_declined' END,
    COALESCE(v_room.room_name, v_room.room_code),
    NULL,
    jsonb_build_object(
      'kind', CASE WHEN p_approve THEN 'room_join_approved' ELSE 'room_join_declined' END,
      'room_id', v_room.id,
      'room_code', v_room.room_code,
      'room_name', v_room.room_name,
      'game_type_key', v_room.game_type_key
    )
  );

  RETURN CASE WHEN p_approve THEN 'approved' ELSE 'declined' END;
END $$;

REVOKE ALL ON FUNCTION public.respond_room_join(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_room_join(uuid, boolean, text) TO authenticated;

-- ── 6. A knock asks the block list, and counts the seats that are taken ────

CREATE OR REPLACE FUNCTION public.request_room_join(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_room game_rooms%ROWTYPE;
  v_me profiles%ROWTYPE;
  v_status text;
  v_existing text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such room';
  END IF;
  IF v_room.is_archived IS TRUE OR v_room.status::text = 'cancelled' THEN
    RAISE EXCEPTION 'that room is closed';
  END IF;

  SELECT status INTO v_existing FROM room_join_requests
   WHERE room_id = p_room_id AND user_id = v_uid;
  IF v_existing = 'blocked' THEN
    RETURN 'blocked';
  END IF;

  -- A block in either direction is the same wall as the host's own
  -- "block this player": no seat, no knock, no notification to the host.
  IF public.is_block_between(v_uid, v_room.host_user_id) THEN
    RETURN 'blocked';
  END IF;

  SELECT * INTO v_me FROM profiles WHERE user_id = v_uid;

  IF v_room.host_user_id = v_uid
     OR EXISTS (SELECT 1 FROM room_participants rp
                 WHERE rp.room_id = p_room_id AND rp.user_id = v_uid) THEN
    RETURN 'joined';
  END IF;

  IF NOT v_room.is_public THEN
    RAISE EXCEPTION 'that room is not public';
  END IF;

  -- Full means seated: an invitation nobody accepted holds no chair.
  IF (SELECT count(*) FROM room_participants rp
       WHERE rp.room_id = p_room_id
         AND rp.status::text IN ('joined', 'ready', 'playing'))
       >= COALESCE(v_room.max_players, 10) THEN
    RAISE EXCEPTION 'that room is full';
  END IF;

  IF NOT v_room.requires_approval
     OR EXISTS (SELECT 1 FROM game_invitations gi
                 WHERE gi.room_id = p_room_id
                   AND gi.receiver_id = v_uid
                   AND gi.status <> 'declined')
     OR v_existing = 'approved' THEN
    INSERT INTO room_participants (room_id, user_id, nickname, avatar_url, country_code, is_host, status)
    VALUES (p_room_id, v_uid, COALESCE(v_me.nickname, 'Player'), v_me.avatar_url,
            COALESCE(v_me.country_code, 'GE'), false, 'joined')
    ON CONFLICT (room_id, user_id) DO UPDATE SET status = 'joined';
    RETURN 'joined';
  END IF;

  INSERT INTO room_join_requests (room_id, user_id, status, created_at, responded_at)
  VALUES (p_room_id, v_uid, 'pending', now(), NULL)
  ON CONFLICT (room_id, user_id) DO UPDATE
    SET status = 'pending', created_at = now(), responded_at = NULL
  RETURNING status INTO v_status;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_room.host_user_id,
    'room_join_request',
    COALESCE(v_me.nickname, 'Someone'),
    COALESCE(v_room.room_name, v_room.room_code),
    jsonb_build_object(
      'kind', 'room_join_request',
      'room_id', p_room_id,
      'room_code', v_room.room_code,
      'room_name', v_room.room_name,
      'requester_id', v_uid,
      'sender_nickname', v_me.nickname,
      'sender_avatar_url', v_me.avatar_url
    )
  );

  RETURN COALESCE(v_status, 'pending');
END $$;

REVOKE ALL ON FUNCTION public.request_room_join(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_room_join(uuid) TO authenticated;

-- ── 7. The public list counts the seated, and says whether it asks first ──
--
-- The return type grows a column, so the function is dropped and made
-- again; the grants below are therefore stated, not inherited.

DROP FUNCTION IF EXISTS public.public_rooms(integer);

CREATE FUNCTION public.public_rooms(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id uuid,
  room_code text,
  room_name text,
  room_icon text,
  game_type_key text,
  game_mode text,
  status text,
  created_at timestamptz,
  last_activity_at timestamptz,
  host_user_id uuid,
  host_nickname text,
  host_avatar_url text,
  player_count integer,
  max_players integer,
  first_category_name text,
  first_category_icon text,
  my_state text,
  rounds jsonb,
  total_questions integer,
  requires_approval boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.room_code,
    r.room_name,
    r.room_icon,
    r.game_type_key,
    r.game_mode,
    r.status::text,
    r.created_at,
    r.last_activity_at,
    r.host_user_id,
    p.nickname,
    p.avatar_url,
    -- Seated only: an invitation nobody accepted and a seat somebody left
    -- are not players, and counting them made rooms read fuller than they
    -- were (a host who invited eight friends listed as 9/10 with two faces).
    (SELECT count(*)::integer FROM room_participants rp
      WHERE rp.room_id = r.id
        AND rp.status::text IN ('joined', 'ready', 'playing')),
    r.max_players,
    COALESCE(q.category_name, r.category_name),
    q.icon_slug,
    CASE
      WHEN r.host_user_id = auth.uid() THEN 'host'
      WHEN EXISTS (
        SELECT 1 FROM room_participants rp
         WHERE rp.room_id = r.id AND rp.user_id = auth.uid()
      ) THEN 'joined'
      ELSE COALESCE(
        (SELECT jr.status FROM room_join_requests jr
          WHERE jr.room_id = r.id AND jr.user_id = auth.uid()),
        'none')
    END,
    COALESCE(
      (SELECT jsonb_agg(
                jsonb_build_object(
                  'name', rq.category_name,
                  'icon_slug', rq.icon_slug,
                  'source_type', rq.source_type)
                ORDER BY rq.position)
         FROM room_category_queue rq
        WHERE rq.room_id = r.id),
      CASE
        WHEN r.category_name IS NOT NULL OR r.category_id IS NOT NULL
          THEN jsonb_build_array(
                 jsonb_build_object(
                   'name', r.category_name,
                   'icon_slug', NULL,
                   'source_type', 'category'))
        ELSE '[]'::jsonb
      END
    ),
    r.total_questions,
    COALESCE(r.requires_approval, false)
  FROM game_rooms r
  JOIN profiles p ON p.user_id = r.host_user_id
  LEFT JOIN LATERAL (
    SELECT rcq.category_name, rcq.icon_slug
      FROM room_category_queue rcq
     WHERE rcq.room_id = r.id
     ORDER BY rcq.position
     LIMIT 1
  ) q ON true
  WHERE r.is_public
    AND r.is_archived IS NOT TRUE
    AND r.status::text IN ('waiting', 'playing')
    AND NOT EXISTS (
      SELECT 1 FROM room_join_requests b
       WHERE b.room_id = r.id
         AND b.user_id = auth.uid()
         AND b.status = 'blocked'
    )
    AND NOT public.is_block_between(auth.uid(), r.host_user_id)
    AND NOT (
      COALESCE(r.last_activity_at, r.created_at) < now() - interval '7 days'
      AND (
        SELECT count(*) FROM room_participants rp2 WHERE rp2.room_id = r.id
      ) <= 1
    )
    AND NOT public.public_room_is_over(r)
  ORDER BY COALESCE(r.last_activity_at, r.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
$$;

REVOKE ALL ON FUNCTION public.public_rooms(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_rooms(integer) TO authenticated;
