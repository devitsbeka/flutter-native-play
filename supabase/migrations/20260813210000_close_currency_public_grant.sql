-- update_user_currency was callable by anyone, including unauthenticated.
--
-- Two mistakes stacked in the previous migration.
--
-- First, Postgres grants EXECUTE on a new function to PUBLIC by default. That
-- migration wrote `GRANT ... TO authenticated` without a matching REVOKE, so
-- the default grant survived and `anon` could call it. Every other function in
-- that file got the REVOKE; this one did not.
--
-- Second, the guard asked `IF auth.uid() IS NOT NULL` and treated NULL as "the
-- service role, let it through". But auth.uid() is also NULL for anon. So an
-- unauthenticated caller reached the permissive branch and could credit any
-- user id it could guess.
--
-- Confirmed against production: an anon POST returned "Profile not found for
-- user 00000000-…", which is the function running, not refusing.
--
-- The fix is both halves. Only authenticated and service_role may execute it,
-- and the permissive branch is entered by proving the service role from the
-- JWT rather than inferring it from an absent uid.

REVOKE ALL ON FUNCTION public.update_user_currency(uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_currency(uuid, integer, integer) FROM anon;

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
  -- Read the role off the request JWT. Edge functions using the service-role
  -- key present role='service_role'; anon and signed-in users present 'anon'
  -- and 'authenticated'. A direct psql session has no claims at all and gets
  -- '', which lands in the enforced branch — deliberately, so that running
  -- this by hand cannot quietly mint currency either.
  v_jwt_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role',
    ''
  );
BEGIN
  IF v_jwt_role <> 'service_role' THEN
    IF v_caller IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_caller <> p_user_id THEN
      RAISE EXCEPTION 'Cannot modify another user''s balance';
    END IF;

    IF p_coins_delta > 0 OR p_gems_delta > 0 THEN
      RAISE EXCEPTION
        'Credits must go through a grant function (claim_daily_reward, '
        'claim_leaderboard_reward, exchange_currency, credit_gameplay_reward)';
    END IF;
  END IF;

  SELECT coins, gems INTO v_current_coins, v_current_gems
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  IF v_current_coins + p_coins_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  IF v_current_gems + p_gems_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  UPDATE profiles
  SET coins = v_current_coins + p_coins_delta,
      gems  = v_current_gems + p_gems_delta,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING coins, gems INTO new_coins, new_gems;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_currency(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_currency(uuid, integer, integer) TO service_role;

-- ── Sweep the rest ─────────────────────────────────────────────────────────
--
-- The same default grant applies to every SECURITY DEFINER function in this
-- schema, so a missing REVOKE anywhere else is the same bug. This pulls the
-- PUBLIC and anon grants off the entitlement and currency surface explicitly
-- rather than trusting that each one remembered.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef                       -- SECURITY DEFINER only
       AND p.proname IN (
             'apply_currency_grant',
             'credit_gameplay_reward',
             'claim_daily_reward',
             'claim_leaderboard_reward',
             'exchange_currency',
             'grant_vip_days',
             'ensure_admin_lifetime_pro',
             'update_user_currency'
           )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
  END LOOP;
END $$;

-- Re-grant the ones clients are meant to call. apply_currency_grant is
-- deliberately absent: it is the internal primitive the claim functions use,
-- and nothing outside the database should reach it.
GRANT EXECUTE ON FUNCTION public.update_user_currency(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_gameplay_reward(text, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_leaderboard_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exchange_currency(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_vip_days(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_admin_lifetime_pro() TO authenticated;
