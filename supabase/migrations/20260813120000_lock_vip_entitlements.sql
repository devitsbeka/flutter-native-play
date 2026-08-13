-- Entitlements become server-authoritative.
--
-- Until now `vip_subscriptions` carried "users can insert/update their own
-- row" policies, so PRO was writable straight from the browser console:
--
--   supabase.from('vip_subscriptions')
--     .insert({ user_id: <me>, vip_tier: 'pro_plus', expires_at: '2099-01-01' })
--
-- No payment, no receipt, no edge function. The verify-receipt endpoint was a
-- second door onto the same room; this migration shuts both by making the
-- table service-role/definer-only and routing every legitimate client grant
-- through a function that decides the duration itself.

-- ── 1. Table writes are no longer a client capability ──────────────────────
--
-- SELECT stays as-is: a user still reads their own row, and VipContext's
-- realtime subscription keeps working. Only the write side closes.

DROP POLICY IF EXISTS "Users can insert their own VIP subscription" ON public.vip_subscriptions;
DROP POLICY IF EXISTS "Users can update their own VIP subscription" ON public.vip_subscriptions;

-- SECURITY DEFINER functions below and the service role (edge functions) are
-- unaffected by RLS, so every writer that should still work still does:
-- redeem_friend_invite, verify-receipt, revenuecat-webhook, delete-user-account.

-- ── 2. One Apple transaction cannot be spread across accounts ──────────────
--
-- verify-receipt stored whatever string the client sent as the original
-- transaction id. Even with real verification in place, the same genuine
-- transaction must never activate two users.

CREATE UNIQUE INDEX IF NOT EXISTS vip_subscriptions_apple_txn_unique
  ON public.vip_subscriptions (apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;

-- ── 3. Store-side purchase events, recorded once ───────────────────────────
--
-- RevenueCat retries webhook deliveries until it gets a 2xx, so the handler
-- has to be idempotent. The event id is the natural key; a conflict on insert
-- means "already applied, acknowledge and move on".

CREATE TABLE IF NOT EXISTS public.iap_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          text NOT NULL UNIQUE,
  event_type        text NOT NULL,
  user_id           uuid,
  product_id        text,
  store             text,
  transaction_id    text,
  event_at          timestamp with time zone,
  payload           jsonb NOT NULL,
  processed_at      timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.iap_events ENABLE ROW LEVEL SECURITY;

-- No policies on purpose. The table is written by the webhook under the
-- service role and read by operators through the dashboard; no client
-- has any business touching it, and RLS with zero policies denies everyone.

CREATE INDEX IF NOT EXISTS iap_events_user_id_idx ON public.iap_events (user_id);
CREATE INDEX IF NOT EXISTS iap_events_event_at_idx ON public.iap_events (event_at DESC);

-- ── 4. The one client-callable grant, with the server picking the duration ──
--
-- The in-app shop sells PRO time for gems. That flow stays, but the client no
-- longer names an expiry date — it names a duration, and the mapping from
-- duration to days lives here. An unknown duration is an error rather than a
-- silent default, which is the same lesson VIP_DURATION_DAYS learned on the
-- TypeScript side when `: 0` quietly meant "a month".
--
-- Deliberately NOT in scope: this does not debit gems. The shop debits before
-- calling, through update_user_currency, exactly as it does today. See the
-- note in docs/IOS_LAUNCH_PLAN.md about the wider client-trusted economy —
-- that is a separate track, and folding it in here would change the shop's
-- purchase semantics in the middle of a security fix.

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

  INSERT INTO public.vip_subscriptions AS vs (user_id, vip_tier, expires_at, auto_renew)
  VALUES (v_user_id, 'standard', v_base + v_interval, false)
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at,
        -- Never demote: a paying pro/pro_plus subscriber who also buys shop
        -- days keeps their tier and just gains time.
        vip_tier   = CASE
                       WHEN vs.vip_tier IN ('pro', 'pro_plus') THEN vs.vip_tier
                       ELSE EXCLUDED.vip_tier
                     END,
        updated_at = now()
  RETURNING vs.expires_at, vs.vip_tier INTO expires_at, vip_tier;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_vip_days(text) FROM public;
GRANT EXECUTE ON FUNCTION public.grant_vip_days(text) TO authenticated;

-- ── 5. Admin lifetime PRO, verified server-side ────────────────────────────
--
-- VipContext self-heals lifetime PRO for admins on login. That worked only
-- because the table was client-writable; now the admin check has to happen
-- where it cannot be skipped.

CREATE OR REPLACE FUNCTION public.ensure_admin_lifetime_pro()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_lifetime constant timestamp with time zone := '2126-01-01T00:00:00Z';
  -- Individually granted lifetime accounts, carried over from
  -- LIFETIME_PRO_USER_IDS in VipContext. They are not necessarily admins, so
  -- checking only the admin role here would have quietly revoked them.
  v_granted  constant uuid[] := ARRAY['a22491af-e2a1-4072-bee0-a2f804393a77'::uuid];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT (v_user_id = ANY(v_granted)) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = v_user_id AND role = 'admin'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at, auto_renew, purchase_platform)
  VALUES (v_user_id, 'pro', v_lifetime, false, 'admin_grant')
  ON CONFLICT (user_id) DO UPDATE
    SET vip_tier   = 'pro',
        expires_at = GREATEST(public.vip_subscriptions.expires_at, v_lifetime),
        updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_admin_lifetime_pro() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_admin_lifetime_pro() TO authenticated;

-- ── 6. Currency changes may only target the caller ─────────────────────────
--
-- update_user_currency is SECURITY DEFINER, granted to `authenticated`, and
-- took the user id as a parameter without ever checking it. Any signed-in
-- user could move coins and gems on any *other* account — drain a rival's
-- balance, or top up a friend's.
--
-- Every client call site already passes its own id (see useCurrency,
-- useMissions, useMissionStreak), so this is a no-op for legitimate callers.
-- Edge functions call it under the service role, where auth.uid() is null,
-- and are allowed through explicitly.
--
-- NOT closed by this: a user may still credit *themselves*, because reward
-- grants (missions, daily rewards, ad rewards) are all client-initiated
-- today. That is the wider client-trusted-economy problem, tracked separately
-- in docs/IOS_LAUNCH_PLAN.md — it needs reward logic moved server-side, which
-- is a bigger change than this migration should be making.

CREATE OR REPLACE FUNCTION public.update_user_currency(
  p_user_id uuid,
  p_coins_delta integer DEFAULT 0,
  p_gems_delta integer DEFAULT 0
)
RETURNS TABLE (new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_coins integer;
  v_current_gems integer;
  v_caller uuid := auth.uid();
BEGIN
  -- auth.uid() is null for the service role, which edge functions use.
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Cannot modify another user''s balance';
  END IF;

  -- Lock the row for update (prevents race conditions)
  SELECT coins, gems INTO v_current_coins, v_current_gems
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if profile exists
  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  -- Prevent negative balances
  IF v_current_coins + p_coins_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  IF v_current_gems + p_gems_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  -- Update and return new values
  UPDATE profiles
  SET
    coins = v_current_coins + p_coins_delta,
    gems = v_current_gems + p_gems_delta,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING coins, gems INTO new_coins, new_gems;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_currency(uuid, integer, integer) TO authenticated;
