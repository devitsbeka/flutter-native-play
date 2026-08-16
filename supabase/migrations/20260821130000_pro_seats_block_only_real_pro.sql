-- "That player already has their own subscription" — for players who had none.
--
-- `grant_pro_seat` refused to give a seat to anyone holding *any* unexpired
-- `vip_subscriptions` row that wasn't itself a seat. That is not the same set
-- as "people who pay for PRO", and the difference is most of the player base:
--
--   * `grant_vip_days` — the shop, where VIP days are bought with coins —
--     inserts without naming `purchase_platform`, and the column's default is
--     'ios'. A day of shop VIP was therefore indistinguishable from an App
--     Store subscription, and locked the player out of receiving PRO for as
--     long as it ran.
--   * `process_referral_reward` (retired in 20260814230000) left rows of the
--     same shape behind — tier 'standard', platform 'ios', nobody paying.
--   * `io.mytrivia.adfree` is a one-off unlock that writes tier 'ad_free'.
--     Owning it is not a subscription and has never conferred PRO, but it
--     blocked the gift all the same.
--
-- So the check is rewritten to ask the question it meant to ask: does this
-- player already hold PRO that a seat must not overwrite? Tier is what
-- answers that — 'pro', 'pro_plus' and 'pro_master', whether paid for at the
-- store or granted by an admin. Everything else is now grantable.
--
-- Which raises the thing the old check was avoiding: the seat's row *replaces*
-- the holder's. A friend three days into ten days of shop VIP would have had
-- them overwritten by the seat, and `revoke_pro_seat` sets the seat row to
-- expired — so taking the seat back would have left them with less than they
-- started with. The seat now remembers what it displaced and hands it back
-- when it ends, whether that is a manual revoke or the granter's subscription
-- lapsing.

-- ── 1. What the seat displaced ────────────────────────────────────────────

ALTER TABLE public.pro_seats
  ADD COLUMN IF NOT EXISTS prior_tier       text,
  ADD COLUMN IF NOT EXISTS prior_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS prior_platform   text;

COMMENT ON COLUMN public.pro_seats.prior_expires_at IS
  'The entitlement this seat overwrote, restored when the seat ends if it has not run out by then. NULL when the holder had nothing active.';

-- ── 2. now() is not immutable ─────────────────────────────────────────────
--
-- `pro_seat_allowance` compares against now() while declared IMMUTABLE, which
-- tells the planner it may fold the call to a constant and reuse it across a
-- cached plan. It has behaved so far because plpgsql calls it per statement,
-- but the declaration is a licence for it to stop. STABLE is the correct
-- volatility for a function that reads the clock and nothing else.

CREATE OR REPLACE FUNCTION public.pro_seat_allowance(
  p_tier text,
  p_expires_at timestamptz,
  p_platform text
) RETURNS integer
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_expires_at IS NULL OR p_expires_at <= now() THEN 0
    WHEN p_platform = 'seat' THEN 0
    WHEN p_tier IN ('pro_plus', 'pro_master') THEN 5
    WHEN p_tier IN ('pro', 'standard') THEN 1
    ELSE 0
  END;
$$;

-- Holding PRO already — the only reason to refuse a gift of PRO. A seat row
-- is excluded because replacing one seat with another is the normal way a
-- player moves between granters, not a conflict.
CREATE OR REPLACE FUNCTION public.pro_seat_holder_has_pro(
  p_tier text,
  p_expires_at timestamptz,
  p_platform text
) RETURNS boolean
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    p_expires_at > now()
      AND COALESCE(p_platform, '') <> 'seat'
      AND p_tier IN ('pro', 'pro_plus', 'pro_master'),
    false);
$$;

-- ── 3. Ending a seat, in one place ────────────────────────────────────────
--
-- Revoking by hand and the granter's subscription lapsing had two copies of
-- "expire the holder's row", and now they have two copies of a restore as
-- well. One function, called by both.

CREATE OR REPLACE FUNCTION public.end_pro_seat(p_seat_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seat public.pro_seats%ROWTYPE;
BEGIN
  SELECT * INTO v_seat FROM public.pro_seats
  WHERE id = p_seat_id AND revoked_at IS NULL;

  IF v_seat.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.pro_seats
  SET revoked_at = now(), revoked_reason = p_reason
  WHERE id = v_seat.id;

  -- Only ever touch a row this system created: a holder who bought their own
  -- subscription while holding a seat keeps it.
  IF v_seat.prior_expires_at IS NOT NULL AND v_seat.prior_expires_at > now() THEN
    UPDATE public.vip_subscriptions
    SET vip_tier          = COALESCE(v_seat.prior_tier, 'standard'),
        expires_at        = v_seat.prior_expires_at,
        auto_renew        = false,
        purchase_platform = v_seat.prior_platform,
        updated_at        = now()
    WHERE user_id = v_seat.holder_id AND purchase_platform = 'seat';
  ELSE
    UPDATE public.vip_subscriptions
    SET expires_at = now(), auto_renew = false, updated_at = now()
    WHERE user_id = v_seat.holder_id AND purchase_platform = 'seat';
  END IF;
END;
$$;

-- ── 4. Granting ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.grant_pro_seat(p_holder_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_granter    uuid := auth.uid();
  v_sub        public.vip_subscriptions%ROWTYPE;
  v_allowance  integer;
  v_used       integer;
  v_holder_sub public.vip_subscriptions%ROWTYPE;
  v_granter_name text;
  v_holder_name  text;
  v_prior_tier     text;
  v_prior_expires  timestamptz;
  v_prior_platform text;
BEGIN
  IF v_granter IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING HINT = 'pro_seat_signed_out';
  END IF;

  IF p_holder_id IS NULL OR p_holder_id = v_granter THEN
    RAISE EXCEPTION 'Pick someone other than yourself' USING HINT = 'pro_seat_self';
  END IF;

  SELECT * INTO v_sub FROM public.vip_subscriptions WHERE user_id = v_granter;

  v_allowance := public.pro_seat_allowance(
    v_sub.vip_tier, v_sub.expires_at, v_sub.purchase_platform);

  IF v_allowance = 0 THEN
    RAISE EXCEPTION 'An active PRO subscription is required to give PRO away'
      USING HINT = 'pro_seat_no_subscription';
  END IF;

  SELECT count(*) INTO v_used
  FROM public.pro_seats
  WHERE granter_id = v_granter AND revoked_at IS NULL;

  IF v_used >= v_allowance THEN
    RAISE EXCEPTION 'All % seat(s) on this subscription are in use', v_allowance
      USING HINT = 'pro_seat_none_free';
  END IF;

  SELECT * INTO v_holder_sub
  FROM public.vip_subscriptions WHERE user_id = p_holder_id;

  -- Never overwrite PRO somebody already has. The seat is not consumed and
  -- the friend keeps what they had, rather than the grant silently replacing
  -- a higher tier or a longer term with this one.
  IF public.pro_seat_holder_has_pro(
       v_holder_sub.vip_tier, v_holder_sub.expires_at, v_holder_sub.purchase_platform) THEN
    RAISE EXCEPTION 'That player already has PRO' USING HINT = 'pro_seat_holder_has_pro';
  END IF;

  -- Anything else active — shop days, ad-free, a leftover referral row — is
  -- displaced by the seat rather than blocking it, so remember it. Without
  -- this the friend is quietly worse off the moment the seat ends.
  IF v_holder_sub.user_id IS NOT NULL
     AND v_holder_sub.expires_at > now()
     AND COALESCE(v_holder_sub.purchase_platform, '') <> 'seat' THEN
    v_prior_tier     := v_holder_sub.vip_tier;
    v_prior_expires  := v_holder_sub.expires_at;
    v_prior_platform := v_holder_sub.purchase_platform;
  END IF;

  INSERT INTO public.pro_seats
    (granter_id, holder_id, prior_tier, prior_expires_at, prior_platform)
  VALUES
    (v_granter, p_holder_id, v_prior_tier, v_prior_expires, v_prior_platform);

  INSERT INTO public.vip_subscriptions
    (user_id, vip_tier, expires_at, auto_renew, purchase_platform)
  VALUES (p_holder_id, 'pro', v_sub.expires_at, false, 'seat')
  ON CONFLICT (user_id) DO UPDATE
    SET vip_tier          = 'pro',
        expires_at        = EXCLUDED.expires_at,
        auto_renew        = false,
        purchase_platform = 'seat',
        updated_at        = now();

  SELECT nickname INTO v_granter_name FROM public.profiles WHERE user_id = v_granter;
  SELECT nickname INTO v_holder_name  FROM public.profiles WHERE user_id = p_holder_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_holder_id, 'subscription',
    'You have PRO',
    COALESCE(v_granter_name, 'A friend') || ' gave you PRO',
    jsonb_build_object(
      'kind', 'pro_seat_granted',
      'sender_nickname', v_granter_name,
      'granter_id', v_granter,
      'expires_at', v_sub.expires_at
    ));

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_granter, 'subscription',
    'PRO sent',
    COALESCE(v_holder_name, 'Your friend') || ' has PRO now',
    jsonb_build_object(
      'kind', 'pro_seat_sent',
      'sender_nickname', v_holder_name,
      'holder_id', p_holder_id,
      'expires_at', v_sub.expires_at
    ));

  RETURN jsonb_build_object(
    'granted', true,
    'seats_used', v_used + 1,
    'seats_total', v_allowance,
    'expires_at', v_sub.expires_at
  );
END;
$$;

-- ── 5. Revoking ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.revoke_pro_seat(p_holder_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_granter uuid := auth.uid();
  v_seat    public.pro_seats%ROWTYPE;
  v_granter_name text;
BEGIN
  IF v_granter IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING HINT = 'pro_seat_signed_out';
  END IF;

  SELECT * INTO v_seat FROM public.pro_seats
  WHERE granter_id = v_granter AND holder_id = p_holder_id AND revoked_at IS NULL;

  IF v_seat.id IS NULL THEN
    RAISE EXCEPTION 'No seat to take back' USING HINT = 'pro_seat_not_found';
  END IF;

  PERFORM public.end_pro_seat(v_seat.id, 'granter_revoked');

  SELECT nickname INTO v_granter_name FROM public.profiles WHERE user_id = v_granter;

  -- Losing PRO without being told is worse than never having had it.
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_holder_id, 'subscription',
    'PRO ended',
    'Your PRO from ' || COALESCE(v_granter_name, 'a friend') || ' has ended',
    jsonb_build_object(
      'kind', 'pro_seat_revoked',
      'sender_nickname', v_granter_name,
      'granter_id', v_granter
    ));

  RETURN jsonb_build_object('revoked', true);
END;
$$;

-- ── 6. The cascade ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cascade_pro_seats()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowance integer;
  v_seat      record;
  v_rank      integer := 0;
BEGIN
  v_allowance := public.pro_seat_allowance(
    NEW.vip_tier, NEW.expires_at, NEW.purchase_platform);

  FOR v_seat IN
    SELECT id, holder_id FROM public.pro_seats
    WHERE granter_id = NEW.user_id AND revoked_at IS NULL
    -- Oldest first, so the ranks that survive are the oldest ones and the
    -- newest grants are the ones revoked.
    ORDER BY seq ASC
  LOOP
    v_rank := v_rank + 1;

    IF v_rank > v_allowance THEN
      PERFORM public.end_pro_seat(
        v_seat.id,
        CASE WHEN v_allowance = 0
             THEN 'granter_subscription_ended'
             ELSE 'granter_downgraded' END);
    ELSE
      -- Surviving seats track the granter's expiry, so a renewal extends them
      -- and a shortened term shortens them.
      UPDATE public.vip_subscriptions
      SET expires_at = NEW.expires_at, updated_at = now()
      WHERE user_id = v_seat.holder_id
        AND purchase_platform = 'seat'
        AND expires_at IS DISTINCT FROM NEW.expires_at;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ── 7. Shop VIP is not a store purchase, and should stop saying it is ─────
--
-- `grant_vip_days` names no platform, so the column default stamps every
-- coin-bought VIP day as 'ios'. That is what made these rows look like App
-- Store subscriptions to `grant_pro_seat`, and it has a second consequence
-- that outlives this fix: `syncSubscription` in supabase/functions/_shared/
-- iap.ts expires any row whose platform is one of ios/android/app_store/
-- play_store when RevenueCat reports nothing active — which is every player
-- who has never bought anything at the store. A RevenueCat sync could take
-- away VIP days somebody spent coins on.
--
-- New rows say 'shop'. Existing ones are left alone: a row that already says
-- 'ios' may be either, and guessing wrong on the other side would leave a
-- cancelled subscriber holding PRO the store can no longer end.

CREATE OR REPLACE FUNCTION public.grant_vip_days(p_duration text)
RETURNS TABLE (expires_at timestamp with time zone, vip_tier text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_interval interval;
  v_now      timestamp with time zone := now();
  v_base     timestamp with time zone;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mirrors VIP_DURATION_DAYS in src/contexts/VipContext.tsx, including its
  -- one oddity: 'month' meant a calendar month there (addMonths), not 30 days,
  -- so it stays a calendar month here.
  v_interval := CASE p_duration
    WHEN 'day'    THEN make_interval(days => 1)
    WHEN '2days'  THEN make_interval(days => 2)
    WHEN 'week'   THEN make_interval(days => 7)
    WHEN '10days' THEN make_interval(days => 10)
    WHEN 'month'  THEN make_interval(months => 1)
    ELSE NULL
  END;

  IF v_interval IS NULL THEN
    RAISE EXCEPTION 'Unknown VIP duration: %', p_duration;
  END IF;

  -- Stacking: extend from the current expiry when it is still in the future,
  -- otherwise start a fresh window from now.
  SELECT GREATEST(COALESCE(s.expires_at, v_now), v_now)
    INTO v_base
    FROM public.vip_subscriptions s
   WHERE s.user_id = v_user_id;

  v_base := COALESCE(v_base, v_now);

  INSERT INTO public.vip_subscriptions AS vs
    (user_id, vip_tier, expires_at, auto_renew, purchase_platform)
  VALUES (v_user_id, 'standard', v_base + v_interval, false, 'shop')
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at,
        -- Never demote: a paying pro/pro_plus subscriber who also buys shop
        -- days keeps their tier and just gains time.
        vip_tier   = CASE
                       WHEN vs.vip_tier IN ('pro', 'pro_plus') THEN vs.vip_tier
                       ELSE EXCLUDED.vip_tier
                     END,
        -- And never relabel a row the store or this system owns. Overwriting
        -- 'ios' here would take a real subscription out of RevenueCat's
        -- reach; overwriting 'seat' would strand a seat the cascade can no
        -- longer find.
        purchase_platform = CASE
                              WHEN COALESCE(vs.purchase_platform, '') IN
                                   ('ios', 'android', 'app_store', 'play_store',
                                    'admin_grant', 'seat')
                              THEN vs.purchase_platform
                              ELSE EXCLUDED.purchase_platform
                            END,
        updated_at = now()
  RETURNING vs.expires_at, vs.vip_tier INTO expires_at, vip_tier;

  RETURN NEXT;
END;
$$;

-- ── 8. Grants ─────────────────────────────────────────────────────────────
--
-- A new SECURITY DEFINER function is executable by PUBLIC by default.
-- (AGENTS.md rule 3.) `end_pro_seat` takes a seat id and no caller check, so
-- it is callable by nobody but the functions above.

REVOKE ALL ON FUNCTION public.end_pro_seat(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pro_seat_holder_has_pro(text, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pro_seat_holder_has_pro(text, timestamptz, text) TO authenticated;
