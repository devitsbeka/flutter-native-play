-- One subscription pays one welcome bundle, however many accounts hold it.
--
-- `grant_subscription_welcome` claims `welcome:<user_id>:<tier>`, which is
-- unique per USER. The project's RevenueCat transfer behaviour is "Transfer
-- to new App User ID", so one Apple ID's subscription moves to whichever
-- account signs in on that phone — and each new account it lands on has no
-- claim yet, so each one is paid a full bundle: 25 000 coins + 10 gems for
-- pro, 50 000 + 20 for pro_plus.
--
-- Registering is free and takes seconds, so that is one subscription minting
-- an unbounded amount of both currencies. Gems are the hard currency; 20 of
-- them is a fifth of the smallest pack anyone pays for.
--
-- The fix is a second claim, keyed on the store transaction rather than the
-- person: `welcome-txn:<apple_original_transaction_id>:<tier>`. The bundle is
-- paid only when BOTH claims are new.
--
--   * The per-user claim stays, so nobody who has already been paid is paid
--     again — changing the key outright would have handed every existing
--     subscriber one more bundle.
--   * The per-transaction claim is only attempted when there is a
--     transaction id. Admin grants and referral rewards have none, and they
--     are not store purchases; they keep the old per-user behaviour.
--   * Seats already return before any of this, and still do.
--
-- Mirrors creditSubscriptionWelcome in supabase/functions/_shared/
-- iapEntitlements.ts, which makes the same two claims. Either may run first —
-- the edge function after its upsert, this trigger during it — and whichever
-- does, the other finds the claim taken.

CREATE OR REPLACE FUNCTION public.grant_subscription_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_coins   integer;
  v_gems    integer;
  v_claimed integer;
  v_txn     text;
BEGIN
  IF NEW.vip_tier IS NULL
     OR NEW.expires_at IS NULL
     OR NEW.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  -- A seat is somebody else's subscription being shared. The owner's own row
  -- paid the bundle; the seats do not pay it again, and reseating a seat does
  -- not pay it to the next holder.
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

  -- ── Claim 1: the subscription itself ────────────────────────────────────
  --
  -- Taken FIRST, so a transfer is stopped before the per-user claim is
  -- written. Doing it the other way round would leave the new holder holding
  -- a `welcome:<user>:<tier>` row that says they were paid when they were
  -- not, and nothing would ever pay them if they later bought their own.
  v_txn := NULLIF(NEW.apple_original_transaction_id, '');

  IF v_txn IS NOT NULL THEN
    INSERT INTO public.iap_events
      (event_id, event_type, user_id, product_id, store, transaction_id, event_at, payload)
    VALUES (
      'welcome-txn:' || v_txn || ':' || NEW.vip_tier,
      'SUBSCRIPTION_WELCOME_TXN',
      NEW.user_id,
      NEW.apple_product_id,
      NEW.purchase_platform,
      v_txn,
      now(),
      jsonb_build_object('tier', NEW.vip_tier, 'granted_by', 'database')
    )
    ON CONFLICT (event_id) DO NOTHING;

    GET DIAGNOSTICS v_claimed = ROW_COUNT;
    IF v_claimed = 0 THEN
      -- This subscription has already paid its bundle, to whoever held it
      -- before the transfer.
      RETURN NEW;
    END IF;
  END IF;

  -- ── Claim 2: this person, this tier ─────────────────────────────────────
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
