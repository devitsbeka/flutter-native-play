-- The daily reward gets better every day of the streak, not just richer in coins.
--
-- What was already true, and is unchanged: the coin base climbs across the
-- seven-day cycle.
--
--     day  1   2   3   4   5   6   7
--     coins 50  75 100 125 150 200 300
--
-- What was NOT true: the *surprise* on top of it was the same lottery on day
-- one and day seven — a flat 35% double-coins, 30% gems, 35% power-up, with
-- 1..3 gems or 1..3 power-ups whichever day you were on. So the seventh day
-- of a streak felt like the first with a bigger number, and a run of
-- double-coins days looked, on the card, like nothing but coins over and over.
--
-- Now the surprise climbs too:
--
--     day            1     2     3     4     5     6     7
--     power-up     20%   25%   30%   35%   40%   45%   50%
--     gems         30%   30%   30%   30%   30%   30%   30%
--     double coins 50%   45%   40%   35%   30%   25%   20%
--     gems, when     1-3   1-3   2-4   2-4   2-4   3-5   3-5
--     powers, when   1-2   1-2   1-2   1-2   2-3   2-3   2-3
--
-- Early days lean on doubled coins, which is the reward that needs no
-- explaining. Later days lean on power-ups, which are worth more to somebody
-- who has been playing all week and knows what a freeze is for. Gems hold
-- steady as the middle option.
--
-- Everything else is carried over from 20260831120000 unchanged: one bonus
-- only so the receipt never needs a third pill, the PRO Plus +50%, the
-- receipt columns, the currency_grants ledger row.
--
-- One addition to that ledger row. Its `reference` recorded "day 3 power",
-- which says a power-up was won but not which one or how many — so a card
-- rebuilt from the ledger (the path that covers days claimed before the
-- receipt columns existed) can show coins and gems but never the power-up.
-- It now records "day 3 power freeze x2", which is enough to draw the whole
-- receipt from the ledger alone.

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
  v_power_pct double precision;
  v_reference text;
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
  --
  -- The power-up's share of the roll climbs 20% -> 50% across the week and
  -- double-coins gives way to it; gems hold the middle at 30% throughout.
  v_power_pct := 0.20 + 0.05 * (v_day - 1);

  IF v_roll < v_power_pct THEN
    bonus     := 'power';
    v_power   := (ARRAY['5050','freeze','replace','time-drain'])[1 + floor(random() * 4)::integer];
    -- 1..2 up to day four, 2..3 from day five. Integer division on purpose.
    v_power_n := (1 + v_day / 5) + floor(random() * 2)::integer;

    INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
    VALUES (v_user_id, v_power, v_power_n)
    ON CONFLICT (user_id, power_up_type)
    DO UPDATE SET quantity   = public.user_power_ups.quantity + EXCLUDED.quantity,
                  updated_at = now();

  ELSIF v_roll < v_power_pct + 0.30 THEN
    bonus  := 'gems';
    -- 1..3, 2..4, 3..5 as the week goes on. Integer division on purpose.
    v_gems := (1 + v_day / 3) + floor(random() * 3)::integer;

  ELSE
    bonus   := 'double_coins';
    v_coins := v_coins * 2;
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
         coins_awarded = v_coins,
         gems_awarded = v_gems,
         power_up = v_power,
         power_up_count = v_power_n,
         updated_at = now()
   WHERE id = v_row.id;

  -- "day 3 power freeze x2" rather than "day 3 power": enough for a receipt
  -- rebuilt from the ledger alone to name the power-up it granted.
  v_reference := 'day ' || v_day::text || ' ' || bonus;
  IF bonus = 'power' THEN
    v_reference := v_reference || ' ' || v_power || ' x' || v_power_n::text;
  END IF;

  SELECT * INTO new_coins, new_gems
    FROM public.apply_currency_grant(
      v_user_id, 'daily_reward', v_coins, v_gems, v_reference);

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
