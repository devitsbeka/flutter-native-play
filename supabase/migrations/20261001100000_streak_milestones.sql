-- Streak milestones: a one-time coin reward for reaching 3, 5, 7, 14, 21
-- and 30 on the play streak (profiles.current_streak), paid from the streak
-- page.
--
-- Why a function rather than credit_gameplay_reward from the client: that
-- function bounds an amount, it does not dedupe one. A milestone is worth
-- claiming exactly once, and "once" has to be decided where the client
-- cannot argue with it — currency_grants has no SELECT policy for users (by
-- design), so the client cannot even see what it has already been paid.
-- The unique index below is the whole guarantee; the EXISTS check in front
-- of it only turns a constraint violation into a readable error.
--
-- The coin table is the client's STREAK_BONUSES from day three up. A unit
-- test (src/__tests__/streakPage.test.ts) reads both and fails if they
-- drift apart.

-- ── ceilings and ledger idempotency ────────────────────────────────────────

INSERT INTO public.currency_grant_limits
  (kind,               max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('streak_milestone',            300,             0,           900,            0)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;

CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_streak_milestone_reference_unique
  ON public.currency_grants (user_id, kind, reference)
  WHERE kind = 'streak_milestone' AND reference IS NOT NULL;

-- ── the table of milestones ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.streak_milestone_coins(p_days integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_days
    WHEN 3  THEN 50
    WHEN 5  THEN 75
    WHEN 7  THEN 100
    WHEN 14 THEN 150
    WHEN 21 THEN 200
    WHEN 30 THEN 300
  END;
$$;

REVOKE ALL ON FUNCTION public.streak_milestone_coins(integer) FROM PUBLIC, anon;

-- ── what the caller has already been paid ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.streak_milestones_claimed()
RETURNS integer[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(split_part(reference, ':', 2)::integer ORDER BY split_part(reference, ':', 2)::integer),
    '{}'::integer[])
  FROM public.currency_grants
  WHERE user_id = auth.uid()
    AND kind = 'streak_milestone'
    AND reference LIKE 'streak:%';
$$;

REVOKE ALL ON FUNCTION public.streak_milestones_claimed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.streak_milestones_claimed() TO authenticated;

-- ── the claim ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_streak_milestone(p_days integer)
RETURNS TABLE (coins_awarded integer, new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_coins integer;
  v_streak integer;
  v_reference text := 'streak:' || p_days;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_coins := public.streak_milestone_coins(p_days);
  IF v_coins IS NULL THEN
    RAISE EXCEPTION 'Unknown streak milestone: %', p_days;
  END IF;

  -- Locked for the duration: two taps in the same moment queue here, and the
  -- second one finds the ledger row the first one wrote.
  SELECT current_streak INTO v_streak
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  IF COALESCE(v_streak, 0) < p_days THEN
    RAISE EXCEPTION 'Milestone not reached: streak is %, milestone is %', COALESCE(v_streak, 0), p_days;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.currency_grants
    WHERE user_id = v_user_id AND kind = 'streak_milestone' AND reference = v_reference
  ) THEN
    RAISE EXCEPTION 'Milestone already claimed: %', p_days;
  END IF;

  RETURN QUERY
    SELECT v_coins, g.new_coins, g.new_gems
    FROM public.apply_currency_grant(v_user_id, 'streak_milestone', v_coins, 0, v_reference) g;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_streak_milestone(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_streak_milestone(integer) TO authenticated;
