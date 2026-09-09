-- The subscription welcome, granted by the database.
--
-- 20261102100000 set the numbers; the thing that PAYS the PRO and Friends
-- PRO bundles was the store sync in supabase/functions/_shared/iap.ts, which
-- only starts granting once that edge function is deployed. This is the same
-- grant as a trigger, so applying SQL is the whole job.
--
-- It also catches what the edge function cannot see: a subscription written
-- by anything other than the store — an admin grant, a referral reward,
-- grant_vip_days — is a subscription somebody holds, and it arrives here too.
--
-- THE TWO PATHS CANNOT PAY TWICE
--
-- Both claim the SAME row before a coin moves: iap_events.event_id
-- 'welcome:<user_id>:<tier>', which is UNIQUE. Whichever runs first takes
-- the claim and the other reads a conflict and stops. So this is safe to
-- apply whether or not the edge function is ever redeployed, and safe to
-- deploy the edge function after it.
--
-- ONCE PER PERSON PER TIER, which is why the key holds the tier: somebody who
-- upgrades PRO -> Friends PRO is buying the bigger plan and gets its bundle.
-- A renewal is the same tier and gets nothing, which is the point.
--
-- The amounts come from economy_config, so the admin economy screen finally
-- decides something: edit pro_welcome_coins there and the next subscription
-- grants the new number. The fallbacks are the values 20261102100000 seeds,
-- for a database where a row was deleted.

-- ── the kind, closed to clients ───────────────────────────────────────────
--
-- credit_gameplay_reward refuses an unknown kind outright, so registering
-- this one at all is what would open it. It is registered at ZERO — the same
-- shape room_stake uses — so the ledger reads consistently while no client
-- call can ever mint through it. The trigger below writes the ledger row
-- itself and does not go through that function.

INSERT INTO public.currency_grant_limits
  (kind,          max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('pro_welcome',              0,             0,             0,            0)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;

-- One welcome per person per tier.
CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_pro_welcome_unique
  ON public.currency_grants (user_id, kind, reference)
  WHERE kind = 'pro_welcome' AND reference IS NOT NULL;

-- ── the grant ─────────────────────────────────────────────────────────────

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
  -- Subscription tiers only. 'ad_free' is bought, but it is not a
  -- subscription and carries no bundle; 'standard' is the absence of one.
  IF NEW.vip_tier NOT IN ('pro', 'pro_plus') THEN
    RETURN NEW;
  END IF;

  -- And only while it is actually held. syncSubscription expires a
  -- cancelled row in place rather than deleting it, so an expiry in the
  -- past is somebody who used to be a subscriber.
  IF NEW.expires_at <= now() THEN
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

  -- The claim, shared with the edge function. Nothing is credited unless
  -- this row is ours: ON CONFLICT DO NOTHING reports zero rows when the
  -- welcome has already been paid, by either path.
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

  -- The ledger row is what makes the balance explainable afterwards. The
  -- tier is the reference, so the unique index above is the second guard
  -- against a repeat.
  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (NEW.user_id, 'pro_welcome', v_coins, v_gems, NEW.vip_tier)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- AFTER, so a failed subscription write grants nothing. On the tier and the
-- expiry: an upgrade changes the tier, and a lapsed subscriber coming back
-- changes the expiry — the claim decides whether either owes anything.
DROP TRIGGER IF EXISTS vip_subscriptions_welcome ON public.vip_subscriptions;
CREATE TRIGGER vip_subscriptions_welcome
  AFTER INSERT OR UPDATE OF vip_tier, expires_at ON public.vip_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.grant_subscription_welcome();

-- Not granted to PUBLIC: a trigger function needs no EXECUTE grant to fire,
-- and this one adds currency.
REVOKE ALL ON FUNCTION public.grant_subscription_welcome() FROM PUBLIC, anon, authenticated;
