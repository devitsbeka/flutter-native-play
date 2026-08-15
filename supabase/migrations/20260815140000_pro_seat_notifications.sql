-- Tell both people what happened to a seat.
--
-- Granting was silent for the person receiving it: their account quietly
-- became PRO and nothing said so, which is a strange way to receive a gift.
-- The granter had only the toast on the screen they were already looking at,
-- so once it faded there was no record that the gift had landed.
--
-- Written here rather than from the client for the reason the referral flow
-- failed: a client cannot insert a notification row for somebody else's
-- account and have RLS allow it. These functions are SECURITY DEFINER and
-- already own the transaction the seat moves in, so the notification lands
-- with the seat or not at all.
--
-- `type` is 'subscription' both ways — it is the icon the app already draws
-- for anything about PRO. What separates the events is data->>'kind', which
-- is what notificationTranslations.ts reads to pick the wording, the same way
-- a completed mission is read out of data->>'mission_id'. The stored title is
-- English and is only a fallback for a build that does not know the kind.

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
BEGIN
  IF v_granter IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  IF p_holder_id IS NULL OR p_holder_id = v_granter THEN
    RAISE EXCEPTION 'Pick someone other than yourself';
  END IF;

  SELECT * INTO v_sub FROM public.vip_subscriptions WHERE user_id = v_granter;

  v_allowance := public.pro_seat_allowance(
    v_sub.vip_tier, v_sub.expires_at, v_sub.purchase_platform);

  IF v_allowance = 0 THEN
    RAISE EXCEPTION 'An active PRO subscription is required to give PRO away';
  END IF;

  SELECT count(*) INTO v_used
  FROM public.pro_seats
  WHERE granter_id = v_granter AND revoked_at IS NULL;

  IF v_used >= v_allowance THEN
    RAISE EXCEPTION 'All % seat(s) on this subscription are in use', v_allowance;
  END IF;

  -- Never overwrite a subscription somebody is paying for. Refusing is the
  -- honest outcome: the seat is not consumed and the friend keeps what they
  -- bought, rather than the grant silently replacing a higher tier.
  SELECT * INTO v_holder_sub
  FROM public.vip_subscriptions WHERE user_id = p_holder_id;

  IF v_holder_sub.user_id IS NOT NULL
     AND v_holder_sub.expires_at > now()
     AND COALESCE(v_holder_sub.purchase_platform, '') <> 'seat' THEN
    RAISE EXCEPTION 'That player already has their own subscription';
  END IF;

  INSERT INTO public.pro_seats (granter_id, holder_id)
  VALUES (v_granter, p_holder_id);

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

  -- The friend, who otherwise finds out by noticing their account changed.
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

  -- And the giver, so the gift is somewhere other than a toast that faded.
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
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT * INTO v_seat FROM public.pro_seats
  WHERE granter_id = v_granter AND holder_id = p_holder_id AND revoked_at IS NULL;

  IF v_seat.id IS NULL THEN
    RAISE EXCEPTION 'No seat to take back';
  END IF;

  UPDATE public.pro_seats
  SET revoked_at = now(), revoked_reason = 'granter_revoked'
  WHERE id = v_seat.id;

  -- Only ever expire a row this system created. A holder who bought their own
  -- subscription in the meantime keeps it.
  UPDATE public.vip_subscriptions
  SET expires_at = now(), auto_renew = false, updated_at = now()
  WHERE user_id = p_holder_id AND purchase_platform = 'seat';

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
