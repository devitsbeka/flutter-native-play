-- AI avatar generation stops being free for anyone who skips the payment.
--
-- `AvatarModal.generateAvatar()` did this:
--
--     const decision = decideGeneration(activeQuota, gems);   // client decides
--     if (decision.action === "charge") await spendGems(1);   // client charges
--     ... then invokes generate-avatar
--
-- Every part of that is the client's. The quota was counted in the browser
-- from rows the browser can also write; the decision to charge was made in the
-- browser; and `generate-avatar` itself checked nothing at all — no quota, no
-- balance, no ceiling. Skipping the `spendGems` line, or calling the function
-- directly with a JWT, is unlimited AI generation.
--
-- This is the same fault as the shop's — the client deciding whether to charge
-- — with one difference that makes it worse rather than better: the cost is
-- REAL. A free gem is inventory we invented; a free image generation is a bill
-- from the model provider.
--
-- Two separate problems, and they need two separate answers:
--
--   1. Is this person over their included allowance and therefore due a gem?
--      That is a game-economy question, and it depends on intent — the app
--      DERIVES portraits on its own (`avatar_`) and repairs broken ones
--      (`heal_`), and neither is a generation anybody asked for. Intent can
--      only come from the caller, so `p_billable` is taken on trust.
--
--   2. Can one account run up an unbounded bill? That is the money question,
--      and it must NOT depend on anything the caller says. Hence the daily
--      ceiling below, which applies to every generation whatever it claims to
--      be. A caller that lies about `p_billable` gets DAILY_CEILING images a
--      day instead of one — annoying, bounded, and no longer a way to spend
--      our money without limit.
--
-- Counted from this table rather than from `avatar_generations`, deliberately:
-- that one is client-writable and its rows are named by the client, so
-- counting from it means counting something the payer controls.

CREATE TABLE IF NOT EXISTS public.avatar_generation_claims (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  /** Whether this one was charged, or fell inside the included allowance. */
  charged    boolean NOT NULL,
  /** What the caller said it was for; recorded for the bill, not trusted. */
  billable   boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.avatar_generation_claims ENABLE ROW LEVEL SECURITY;

-- Readable by its owner, never client-writable. Written by the edge function
-- under the service role, which RLS does not apply to.
DROP POLICY IF EXISTS "Users can view their own generation claims" ON public.avatar_generation_claims;
CREATE POLICY "Users can view their own generation claims"
  ON public.avatar_generation_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS avatar_generation_claims_user_day_idx
  ON public.avatar_generation_claims (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.claim_avatar_generation(
  p_user_id  uuid,
  p_billable boolean DEFAULT true
)
RETURNS text   -- 'free' | 'charged'
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Mirrors FREE_AVATAR_GENERATIONS / MAX_AVATAR_GENERATIONS in
  -- src/utils/avatarStudio.ts; src/__tests__/avatarGenerationCharge.test.ts
  -- reads this file and fails if the two disagree.
  v_free_allowance constant integer := 1;
  v_pro_allowance  constant integer := 5;
  v_gem_cost       constant integer := 1;
  -- The ceiling that does not depend on anything the caller says. Generous
  -- enough that no real person meets it — the included allowance is one, or
  -- five with PRO — and low enough that the bill has a bottom.
  v_daily_ceiling  constant integer := 20;

  v_is_pro    boolean;
  v_allowance integer;
  v_billed    integer;
  v_today     integer;
  v_gems      integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- A signed-in caller may only ever claim for themselves. The edge function
  -- runs as the service role (auth.uid() is null) and passes the id it read
  -- off the verified JWT.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot generate on another account';
  END IF;

  SELECT count(*) INTO v_today
    FROM public.avatar_generation_claims
   WHERE user_id = p_user_id
     AND created_at >= date_trunc('day', now());

  IF v_today >= v_daily_ceiling THEN
    RAISE EXCEPTION 'Daily generation limit reached';
  END IF;

  IF NOT p_billable THEN
    -- Derived and repair portraits: inside the ceiling, never charged.
    INSERT INTO public.avatar_generation_claims (user_id, charged, billable)
    VALUES (p_user_id, false, false);
    RETURN 'free';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.vip_subscriptions
     WHERE user_id = p_user_id AND expires_at > now()
  ) INTO v_is_pro;

  v_allowance := CASE WHEN v_is_pro THEN v_pro_allowance ELSE v_free_allowance END;

  SELECT count(*) INTO v_billed
    FROM public.avatar_generation_claims
   WHERE user_id = p_user_id AND billable;

  IF v_billed < v_allowance THEN
    INSERT INTO public.avatar_generation_claims (user_id, charged, billable)
    VALUES (p_user_id, false, true);
    RETURN 'free';
  END IF;

  SELECT gems INTO v_gems FROM public.profiles
   WHERE user_id = p_user_id FOR UPDATE;

  IF v_gems IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_gems < v_gem_cost THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  UPDATE public.profiles
     SET gems = gems - v_gem_cost, updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (p_user_id, 'avatar_generation', 0, -v_gem_cost, 'portrait');

  INSERT INTO public.avatar_generation_claims (user_id, charged, billable)
  VALUES (p_user_id, true, true);

  RETURN 'charged';
END;
$$;

-- NOT granted to `authenticated`. The only caller is the edge function, under
-- the service role — a client that could claim without generating could burn
-- its own gems, and one that could generate without claiming is the bug.
-- FROM PUBLIC, anon, authenticated. Revoking PUBLIC alone leaves Supabase's
-- explicit default grant in place — see 20261104140000.
REVOKE ALL ON FUNCTION public.claim_avatar_generation(uuid, boolean)
  FROM PUBLIC, anon, authenticated;

-- Refund path, for a generation that was charged and then failed. Same
-- reasoning as the released `iap_events` claim in _shared/iap.ts: better to
-- undo the charge than to leave somebody paid-up and empty-handed.
CREATE OR REPLACE FUNCTION public.refund_avatar_generation(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_id uuid;
BEGIN
  SELECT id INTO v_claim_id
    FROM public.avatar_generation_claims
   WHERE user_id = p_user_id AND charged
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_claim_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.avatar_generation_claims WHERE id = v_claim_id;

  UPDATE public.profiles
     SET gems = gems + 1, updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (p_user_id, 'avatar_generation', 0, 1, 'refund');
END;
$$;

REVOKE ALL ON FUNCTION public.refund_avatar_generation(uuid)
  FROM PUBLIC, anon, authenticated;
