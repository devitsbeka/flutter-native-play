-- PRO seats: a subscriber grants PRO to friends, bounded by their tier.
--
-- PRO carries 1 seat, Friends PRO carries 5. This is what the tier cards
-- advertised for months and the app never did — `PRO_TIERS` listed "1 friend
-- invite" and "5 friend invites" while nothing in the schema granted a seat to
-- anyone.
--
-- What did exist was `process_referral_reward(invite_id, new_user_id)`, and it
-- was a different feature wearing the same words: ten days of PRO to both
-- parties for a referral, open to every signed-in user rather than to
-- subscribers. It took the recipient as a parameter and was granted to anon,
-- so a player could write an invite naming themselves as inviter and call it
-- with their own id — two calls, no friend, ten days of PRO, repeatable. It
-- also never paid out, because the signup insert it depended on was refused by
-- RLS. `20260814230000_retire_referral_pro_grant.sql` removed it.
--
-- This is the feature the cards were describing, built to the rules that
-- version got wrong:
--
--   * the granter comes from auth.uid(), never from a parameter
--   * only an active, *paid* subscription confers seats
--   * seats are counted against the tier's allowance and refused past it
--   * a seat expires with the subscription that paid for it
--
-- Seats are granted to accounts that already exist. The old flow tried to
-- grant at signup, which is where it broke: the friend saw a success toast and
-- received nothing. Granting to a registered user removes that failure mode
-- entirely.

-- ── 1. The seat ledger ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pro_seats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Insertion order, and the only sound basis for "newest first" when the
  -- allowance shrinks. granted_at cannot do it: now() is transaction start
  -- time, so seats granted in one transaction share a timestamp exactly, and
  -- the tiebreaker becomes a random uuid — an arbitrary choice about whose
  -- paid access is taken away.
  seq         bigint GENERATED ALWAYS AS IDENTITY,
  granter_id  uuid NOT NULL,
  holder_id   uuid NOT NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz,
  revoked_reason text,
  CONSTRAINT pro_seats_no_self CHECK (granter_id <> holder_id)
);

-- One live seat per holder, from anyone. Without this a player could collect
-- seats from several subscribers and keep PRO as each one lapses in turn.
CREATE UNIQUE INDEX IF NOT EXISTS pro_seats_one_live_per_holder
  ON public.pro_seats (holder_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS pro_seats_granter_live
  ON public.pro_seats (granter_id) WHERE revoked_at IS NULL;

ALTER TABLE public.pro_seats ENABLE ROW LEVEL SECURITY;

-- Readable by both sides of the grant. Never writable by a client: every
-- change goes through the functions below, which is the whole point.
DROP POLICY IF EXISTS "Seat parties can read the seat" ON public.pro_seats;
CREATE POLICY "Seat parties can read the seat"
  ON public.pro_seats FOR SELECT
  USING (auth.uid() = granter_id OR auth.uid() = holder_id);

-- ── 2. How many seats a subscription confers ──────────────────────────────

-- Seats come only from a subscription somebody paid for. A seat-granted row
-- carries tier 'pro', so reading the tier alone would give every seat holder
-- an allowance of their own — one purchase becoming an unbounded chain of
-- PRO. purchase_platform is what separates the two.
CREATE OR REPLACE FUNCTION public.pro_seat_allowance(
  p_tier text,
  p_expires_at timestamptz,
  p_platform text
) RETURNS integer
LANGUAGE sql IMMUTABLE
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

-- ── 3. Granting ───────────────────────────────────────────────────────────

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

  RETURN jsonb_build_object(
    'granted', true,
    'seats_used', v_used + 1,
    'seats_total', v_allowance,
    'expires_at', v_sub.expires_at
  );
END;
$$;

-- ── 4. Revoking ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.revoke_pro_seat(p_holder_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_granter uuid := auth.uid();
  v_seat    public.pro_seats%ROWTYPE;
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

  RETURN jsonb_build_object('revoked', true);
END;
$$;

-- ── 5. The cascade ────────────────────────────────────────────────────────

-- A seat must not outlive the subscription that paid for it. Doing this in a
-- trigger rather than at the call sites means it holds no matter which path
-- changed the subscription — the RevenueCat webhook, verify-receipt, an admin
-- grant, or a manual fix.
--
-- Newest seats are revoked first when the allowance shrinks, so a downgrade
-- from Friends PRO to PRO keeps the friend who has had it longest.
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
    -- newest grants are the ones revoked. Ordering the other way keeps the
    -- most recent friend and drops the one who has had it longest, which is
    -- the opposite of the intent and looks identical in the code.
    ORDER BY seq ASC
  LOOP
    v_rank := v_rank + 1;

    IF v_rank > v_allowance THEN
      UPDATE public.pro_seats
      SET revoked_at = now(),
          revoked_reason = CASE WHEN v_allowance = 0
                                THEN 'granter_subscription_ended'
                                ELSE 'granter_downgraded' END
      WHERE id = v_seat.id;

      UPDATE public.vip_subscriptions
      SET expires_at = now(), auto_renew = false, updated_at = now()
      WHERE user_id = v_seat.holder_id AND purchase_platform = 'seat';
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

DROP TRIGGER IF EXISTS cascade_pro_seats_on_change ON public.vip_subscriptions;
CREATE TRIGGER cascade_pro_seats_on_change
  AFTER INSERT OR UPDATE OF vip_tier, expires_at, purchase_platform
  ON public.vip_subscriptions
  FOR EACH ROW
  -- Seat rows confer nothing, so they never cascade. That is also what stops
  -- the trigger recursing through the rows it just updated.
  WHEN (NEW.purchase_platform IS DISTINCT FROM 'seat')
  EXECUTE FUNCTION public.cascade_pro_seats();

-- ── 6. Grants ─────────────────────────────────────────────────────────────

-- A new SECURITY DEFINER function is executable by PUBLIC by default, which is
-- how the function this replaces came to be callable by anon. Revoke first,
-- then grant deliberately. (AGENTS.md rule 3.)
REVOKE ALL ON FUNCTION public.grant_pro_seat(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_pro_seat(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pro_seat_allowance(text, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cascade_pro_seats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.grant_pro_seat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_pro_seat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pro_seat_allowance(text, timestamptz, text) TO authenticated;
