-- Put a surprise inside the daily gift.
--
-- The modal now hides the amount behind a closed gift box, but the payout was
-- still the same fixed table every week — a surprise with no surprise in it.
-- Every claim now rolls one bonus on top of the day's base coins:
--
--   35%  double coins   — twice the day's usual amount
--   30%  gems           — 1 to 3, on top of any the day already pays
--   35%  power-ups      — 1 or 2 of a random type (5050 / freeze / replace /
--                         time-drain), granted server-side into user_power_ups
--
-- Everything stays server-decided, per the rule that clients never credit
-- themselves: the roll, the amounts, the power-up grant and the PRO Plus
-- multiplier all happen in here, and what the function returns is what was
-- actually paid. The client only renders it.
--
-- The return row gains three columns (bonus, power_up, power_up_count).
-- Adding columns changes the return type, which CREATE OR REPLACE refuses —
-- hence the DROP. Clients deployed before this read only the old columns and
-- ignore the new ones, so the swap is safe for them.

DROP FUNCTION IF EXISTS public.claim_daily_reward();

CREATE FUNCTION public.claim_daily_reward()
RETURNS TABLE (
  coins_awarded  integer,
  gems_awarded   integer,
  streak         integer,
  new_coins      integer,
  new_gems       integer,
  bonus          text,     -- 'double_coins' | 'gems' | 'power'
  power_up       text,     -- set only when bonus = 'power'
  power_up_count integer   -- set only when bonus = 'power', else 0
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_today    date := CURRENT_DATE;
  v_row      public.user_daily_rewards%ROWTYPE;
  v_prev     public.user_daily_rewards%ROWTYPE;
  v_streak   integer;
  v_day      integer;
  v_coins    integer;
  v_gems     integer;
  v_is_pro_plus boolean;
  v_roll     double precision := random();
  v_power    text;
  v_power_n  integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Take today's row, creating it if this is the first interaction today.
  -- FOR UPDATE serialises two taps racing each other.
  SELECT * INTO v_row
    FROM public.user_daily_rewards
   WHERE user_id = v_user_id AND reward_date = v_today
     FOR UPDATE;

  IF v_row.id IS NOT NULL AND v_row.daily_claimed THEN
    RAISE EXCEPTION 'Daily reward already claimed today';
  END IF;

  IF v_row.id IS NULL THEN
    -- Streak continues only from yesterday; any longer gap restarts it.
    SELECT * INTO v_prev
      FROM public.user_daily_rewards
     WHERE user_id = v_user_id AND reward_date = v_today - 1;

    v_streak := COALESCE(v_prev.streak_count, 0) + 1;

    INSERT INTO public.user_daily_rewards (user_id, reward_date, streak_count)
    VALUES (v_user_id, v_today, v_streak)
    RETURNING * INTO v_row;
  ELSE
    v_streak := COALESCE(v_row.streak_count, 1);
  END IF;

  -- Day 1..7 of the cycle, matching the client's card selection.
  v_day := ((v_streak - 1) % 7) + 1;

  SELECT c, g INTO v_coins, v_gems FROM (VALUES
    (1,  50, 0),
    (2,  75, 0),
    (3, 100, 1),
    (4, 125, 0),
    (5, 150, 2),
    (6, 200, 0),
    (7, 300, 5)
  ) AS t(d, c, g) WHERE d = v_day;

  -- ── The surprise ─────────────────────────────────────────────────────────
  IF v_roll < 0.35 THEN
    bonus   := 'double_coins';
    v_coins := v_coins * 2;
  ELSIF v_roll < 0.65 THEN
    bonus  := 'gems';
    v_gems := v_gems + 1 + floor(random() * 3)::integer;  -- +1..3
  ELSE
    bonus     := 'power';
    v_power   := (ARRAY['5050','freeze','replace','time-drain'])[1 + floor(random() * 4)::integer];
    v_power_n := 1 + floor(random() * 2)::integer;        -- 1..2

    INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
    VALUES (v_user_id, v_power, v_power_n)
    ON CONFLICT (user_id, power_up_type)
    DO UPDATE SET quantity   = public.user_power_ups.quantity + EXCLUDED.quantity,
                  updated_at = now();
  END IF;

  -- PRO Plus gets +50%, matching getDailyRewardMultiplier(). Checked against
  -- the subscription table rather than taken on the client's word. Applied
  -- after the roll, so a doubled day is doubled-then-boosted for them too.
  SELECT EXISTS (
    SELECT 1 FROM public.vip_subscriptions
     WHERE user_id = v_user_id
       AND vip_tier = 'pro_plus'
       AND expires_at > now()
  ) INTO v_is_pro_plus;

  IF v_is_pro_plus THEN
    v_coins := floor(v_coins * 1.5);
    v_gems  := floor(v_gems * 1.5);
  END IF;

  UPDATE public.user_daily_rewards
     SET daily_claimed = true,
         daily_claimed_at = now(),
         updated_at = now()
   WHERE id = v_row.id;

  SELECT * INTO new_coins, new_gems
    FROM public.apply_currency_grant(
      v_user_id, 'daily_reward', v_coins, v_gems,
      'day ' || v_day::text || ' ' || bonus);

  coins_awarded  := v_coins;
  gems_awarded   := v_gems;
  streak         := v_streak;
  power_up       := v_power;
  power_up_count := v_power_n;
  RETURN NEXT;
END;
$$;

-- A new SECURITY DEFINER function is granted to PUBLIC by default — always
-- revoke first, then grant exactly who may call it (CLAUDE.md rule 3).
REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;
