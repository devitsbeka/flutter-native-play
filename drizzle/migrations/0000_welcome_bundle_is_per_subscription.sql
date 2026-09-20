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

  -- Claim 1: the subscription itself, taken FIRST, so a transfer is stopped
  -- before the per-user claim is written.
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
      RETURN NEW;
    END IF;
  END IF;

  -- Claim 2: this person, this tier.
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