-- Keep the daily gift to two kinds of reward.
--
-- The card lays out one pill per kind, and three did not fit. Three was
-- reachable because the base table paid gems on days 3, 5 and 7, and the
-- surprise could then land on a power-up: coins + gems + power-up, three
-- pills in a row built for two.
--
-- Only those three days could do it. Every other day paid coins alone, so
-- whatever the surprise added came to two.
--
-- The base is coins on all seven days now, and the surprise decides the
-- second kind:
--
--   35%  double coins   — coins alone, twice the day's amount
--   30%  gems           — 1 to 3
--   35%  power-ups      — 1 to 3 of a random type
--
-- Coins are the constant, which is the intent: every day pays coins, and
-- what varies is what comes with them. Power-ups go to 1-3 from 1-2, since
-- they no longer share a day with base gems.
--
-- Worth recording plainly, because it is the real cost of this change: the
-- base table used to guarantee 8 gems a week (1 on day 3, 2 on day 5, 5 on
-- day 7). At the exchange_currency rate of 500 coins to a gem, that was
-- 4,000 coins of value a week, and it is gone. Gems now come only from the
-- 30% roll, averaging roughly 0.6 a day. If the daily gift should still be
-- a dependable gem source, the coin curve below is the place to compensate,
-- or the gem roll is the place to widen.
--
-- The return type is unchanged, so this is a plain replace, and clients need
-- no deploy to match it.

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
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

  -- Coins only. The surprise below is what makes a day differ from the one
  -- before it; the base is the same kind of thing every time.
  SELECT c INTO v_coins FROM (VALUES
    (1,  50),
    (2,  75),
    (3, 100),
    (4, 125),
    (5, 150),
    (6, 200),
    (7, 300)
  ) AS t(d, c) WHERE d = v_day;

  v_gems := 0;

  -- ── The surprise: exactly one of these, so never a third pill ────────────
  IF v_roll < 0.35 THEN
    bonus   := 'double_coins';
    v_coins := v_coins * 2;
  ELSIF v_roll < 0.65 THEN
    bonus  := 'gems';
    v_gems := 1 + floor(random() * 3)::integer;           -- 1..3
  ELSE
    bonus     := 'power';
    v_power   := (ARRAY['5050','freeze','replace','time-drain'])[1 + floor(random() * 4)::integer];
    v_power_n := 1 + floor(random() * 3)::integer;        -- 1..3

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
