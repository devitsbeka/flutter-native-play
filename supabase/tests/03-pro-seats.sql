-- PRO seats, as assertions.
--
-- The feature this replaces was exploitable and never paid out, so every claim
-- made in 20260815090000_pro_seats.sql is checked here against a real
-- Postgres rather than trusted because the SQL compiled.
--
-- Run after the shim and every migration:
--   psql -h /tmp -p 55432 -U postgres -f supabase/tests/03-pro-seats.sql

\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE raised boolean := false;
BEGIN
  BEGIN EXECUTE stmt; EXCEPTION WHEN OTHERS THEN raised := true; END;
  IF NOT raised THEN
    RAISE EXCEPTION 'ASSERTION FAILED (should have been refused): %', label;
  END IF;
  RAISE NOTICE 'ok (refused): %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, want %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END; $$;

-- ── fixtures ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', u::text, false); $$;

CREATE OR REPLACE FUNCTION pg_temp.give_sub(
  u uuid, tier text, days int, platform text DEFAULT 'ios'
) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.vip_subscriptions
    (user_id, vip_tier, expires_at, auto_renew, purchase_platform)
  VALUES (u, tier, now() + make_interval(days => days), true, platform)
  ON CONFLICT (user_id) DO UPDATE
    SET vip_tier = EXCLUDED.vip_tier,
        expires_at = EXCLUDED.expires_at,
        purchase_platform = EXCLUDED.purchase_platform,
        updated_at = now();
$$;

DO $$
DECLARE
  boss uuid := '10000000-0000-0000-0000-000000000001';
  solo uuid := '10000000-0000-0000-0000-000000000002';
  f1 uuid := '20000000-0000-0000-0000-000000000001';
  f2 uuid := '20000000-0000-0000-0000-000000000002';
  f3 uuid := '20000000-0000-0000-0000-000000000003';
  f4 uuid := '20000000-0000-0000-0000-000000000004';
  f5 uuid := '20000000-0000-0000-0000-000000000005';
  f6 uuid := '20000000-0000-0000-0000-000000000006';
  payer uuid := '30000000-0000-0000-0000-000000000001';
  nobody uuid := '40000000-0000-0000-0000-000000000001';
  v_tier text; v_platform text; v_exp timestamptz; v_boss_exp timestamptz;
  v_live int;
BEGIN
  DELETE FROM public.pro_seats;
  DELETE FROM public.vip_subscriptions;

  -- 1. No subscription, no seats to give.
  PERFORM pg_temp.as_user(nobody);
  PERFORM pg_temp.must_fail(
    format('SELECT public.grant_pro_seat(%L::uuid)', f1),
    'a player with no subscription cannot grant a seat');

  -- 2. A PRO subscriber gets exactly one.
  PERFORM pg_temp.give_sub(solo, 'pro', 30);
  PERFORM pg_temp.as_user(solo);
  PERFORM public.grant_pro_seat(f1);

  SELECT vip_tier, purchase_platform INTO v_tier, v_platform
  FROM public.vip_subscriptions WHERE user_id = f1;
  PERFORM pg_temp.must_equal(v_tier, 'pro', 'seat holder is PRO');
  PERFORM pg_temp.must_equal(v_platform, 'seat', 'seat holder row is marked as a seat');

  PERFORM pg_temp.must_fail(
    format('SELECT public.grant_pro_seat(%L::uuid)', f2),
    'PRO cannot grant a second seat');

  -- 3. A seat confers no seats of its own. Without this one subscription
  --    chains into unlimited PRO.
  PERFORM pg_temp.as_user(f1);
  PERFORM pg_temp.must_fail(
    format('SELECT public.grant_pro_seat(%L::uuid)', f2),
    'a seat holder cannot grant seats onward');

  -- 4. Nobody grants themselves anything.
  PERFORM pg_temp.as_user(solo);
  PERFORM pg_temp.must_fail(
    format('SELECT public.grant_pro_seat(%L::uuid)', solo),
    'cannot grant a seat to yourself');

  -- 5. Anonymous callers are refused. This is the shape of the hole in
  --    process_referral_reward, which anon could execute.
  PERFORM set_config('test.uid', '', false);
  PERFORM pg_temp.must_fail(
    format('SELECT public.grant_pro_seat(%L::uuid)', f3),
    'anonymous caller cannot grant a seat');

  -- 6. Friends PRO carries five, and refuses the sixth.
  PERFORM pg_temp.give_sub(boss, 'pro_plus', 30);
  PERFORM pg_temp.as_user(boss);
  PERFORM public.grant_pro_seat(f2);
  PERFORM public.grant_pro_seat(f3);
  PERFORM public.grant_pro_seat(f4);
  PERFORM public.grant_pro_seat(f5);
  PERFORM public.grant_pro_seat(f6);

  SELECT count(*) INTO v_live FROM public.pro_seats
  WHERE granter_id = boss AND revoked_at IS NULL;
  PERFORM pg_temp.must_equal(v_live, 5, 'Friends PRO grants five seats');

  PERFORM pg_temp.must_fail(
    'SELECT public.grant_pro_seat(''50000000-0000-0000-0000-000000000009''::uuid)',
    'Friends PRO cannot grant a sixth seat');

  -- 7. A paying player is never overwritten by a seat.
  PERFORM pg_temp.give_sub(payer, 'pro_plus', 30, 'ios');
  PERFORM pg_temp.must_fail(
    format('SELECT public.grant_pro_seat(%L::uuid)', payer),
    'cannot hand a seat to someone with their own subscription');

  -- 8. Seats track the granter's expiry, so a renewal extends them.
  PERFORM pg_temp.give_sub(boss, 'pro_plus', 60);
  SELECT expires_at INTO v_boss_exp FROM public.vip_subscriptions WHERE user_id = boss;
  SELECT expires_at INTO v_exp FROM public.vip_subscriptions WHERE user_id = f2;
  PERFORM pg_temp.must_equal(v_exp, v_boss_exp, 'a renewal extends every live seat');

  -- 9. Downgrade to PRO keeps the oldest seat and revokes the newest four.
  PERFORM pg_temp.give_sub(boss, 'pro', 60);
  SELECT count(*) INTO v_live FROM public.pro_seats
  WHERE granter_id = boss AND revoked_at IS NULL;
  PERFORM pg_temp.must_equal(v_live, 1, 'downgrade leaves one live seat');

  SELECT count(*) INTO v_live FROM public.pro_seats
  WHERE granter_id = boss AND holder_id = f2 AND revoked_at IS NULL;
  PERFORM pg_temp.must_equal(v_live, 1, 'the seat kept is the oldest one');

  SELECT expires_at INTO v_exp FROM public.vip_subscriptions WHERE user_id = f6;
  PERFORM pg_temp.must_equal(v_exp <= now(), true, 'a revoked seat holder loses PRO');

  -- 10. The subscription ending takes its seats with it.
  UPDATE public.vip_subscriptions
  SET expires_at = now() - interval '1 minute' WHERE user_id = boss;

  SELECT count(*) INTO v_live FROM public.pro_seats
  WHERE granter_id = boss AND revoked_at IS NULL;
  PERFORM pg_temp.must_equal(v_live, 0, 'an expired subscription revokes every seat');

  SELECT expires_at INTO v_exp FROM public.vip_subscriptions WHERE user_id = f2;
  PERFORM pg_temp.must_equal(v_exp <= now(), true, 'the last seat holder loses PRO too');

  -- 11. A granter can take a seat back by hand.
  PERFORM pg_temp.as_user(solo);
  PERFORM public.revoke_pro_seat(f1);
  SELECT expires_at INTO v_exp FROM public.vip_subscriptions WHERE user_id = f1;
  PERFORM pg_temp.must_equal(v_exp <= now(), true, 'revoking a seat ends the holder''s PRO');

  -- 12. And cannot take back one they never gave.
  PERFORM pg_temp.must_fail(
    format('SELECT public.revoke_pro_seat(%L::uuid)', f4),
    'cannot revoke a seat you did not grant');

  -- ── what "already has their own subscription" is allowed to mean ────────
  --
  -- solo is PRO with its one seat free again after step 11.

  -- 13. Shop VIP is not a subscription anyone pays for. Refusing on it meant
  --     refusing every player who had ever spent coins on VIP days — which is
  --     what the bug report was: friends who had none were told they had one.
  PERFORM pg_temp.give_sub(f3, 'standard', 10, 'shop');
  PERFORM pg_temp.as_user(solo);
  PERFORM public.grant_pro_seat(f3);

  SELECT vip_tier, purchase_platform INTO v_tier, v_platform
  FROM public.vip_subscriptions WHERE user_id = f3;
  PERFORM pg_temp.must_equal(v_tier, 'pro', 'a player holding shop VIP can be given PRO');
  PERFORM pg_temp.must_equal(v_platform, 'seat', 'and the seat takes the row over');

  SELECT prior_expires_at INTO v_exp FROM public.pro_seats
  WHERE holder_id = f3 AND revoked_at IS NULL;
  PERFORM pg_temp.must_equal(v_exp IS NOT NULL, true, 'the seat records what it displaced');

  -- 14. The displaced days come back when the seat ends. Without this the
  --     gift leaves the friend worse off than before it arrived.
  PERFORM public.revoke_pro_seat(f3);
  SELECT vip_tier, purchase_platform, expires_at INTO v_tier, v_platform, v_exp
  FROM public.vip_subscriptions WHERE user_id = f3;
  PERFORM pg_temp.must_equal(v_tier, 'standard', 'ending the seat gives the tier back');
  PERFORM pg_temp.must_equal(v_platform, 'shop', 'and the platform');
  PERFORM pg_temp.must_equal(v_exp > now(), true, 'and the days that were left on it');

  -- 15. Ad-free is a one-off unlock, not a subscription — and never conferred
  --     PRO, so owning it cannot be a reason to refuse PRO.
  PERFORM pg_temp.give_sub(f4, 'ad_free', 3650, 'ios');
  PERFORM public.grant_pro_seat(f4);
  SELECT vip_tier INTO v_tier FROM public.vip_subscriptions WHERE user_id = f4;
  PERFORM pg_temp.must_equal(v_tier, 'pro', 'an ad-free owner can be given PRO');

  PERFORM public.revoke_pro_seat(f4);
  SELECT vip_tier INTO v_tier FROM public.vip_subscriptions WHERE user_id = f4;
  PERFORM pg_temp.must_equal(v_tier, 'ad_free', 'and keeps the ad-free unlock afterwards');

  -- 16. PRO somebody already holds is still never overwritten, however they
  --     came by it. A seat would replace a lifetime admin grant with a term.
  PERFORM pg_temp.give_sub(f5, 'pro', 3650, 'admin_grant');
  PERFORM pg_temp.must_fail(
    format('SELECT public.grant_pro_seat(%L::uuid)', f5),
    'cannot overwrite PRO the player already holds');

  RAISE NOTICE '--- all pro-seat assertions held ---';
END $$;
