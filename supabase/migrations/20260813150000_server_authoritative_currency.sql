-- Currency credits stop being something the client can name.
--
-- update_user_currency is SECURITY DEFINER and granted to `authenticated`,
-- and until now it took the amount as a parameter and applied it. The earlier
-- migration stopped one user targeting another; it did not stop this:
--
--   supabase.rpc('update_user_currency', { p_user_id: <me>, p_gems_delta: 999999 })
--
-- Which matters beyond the balance itself, because gems buy PRO days through
-- the shop — so minting currency was still a route to a free subscription
-- after every direct route to the subscription table was closed.
--
-- The shape of the fix: clients may still *spend* freely (a debit can only
-- hurt the person making it), but every credit now goes through a function
-- that decides the amount itself, or — where the amount genuinely depends on
-- gameplay the server does not yet score — through one that bounds it and
-- writes it down.

-- ── 1. The ledger ──────────────────────────────────────────────────────────
--
-- Every server-side credit lands here. Two jobs: per-day caps are computed
-- from it, and it is the only way to answer "where did this balance come
-- from" after the fact.

CREATE TABLE IF NOT EXISTS public.currency_grants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  kind        text NOT NULL,
  coins       integer NOT NULL DEFAULT 0,
  gems        integer NOT NULL DEFAULT 0,
  -- Free-form pointer at whatever caused the grant: a level number, a room
  -- id, a mission id. Not enforced, because the causes are heterogeneous.
  reference   text,
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.currency_grants ENABLE ROW LEVEL SECURITY;

-- Readable by its owner so the app can show a history; never client-writable.
CREATE POLICY "Users can view their own currency grants"
  ON public.currency_grants FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS currency_grants_user_day_idx
  ON public.currency_grants (user_id, kind, created_at DESC);

-- ── 2. What each kind of grant is allowed to be worth ──────────────────────
--
-- Per-call ceilings and per-day totals. These are not balance tuning — they
-- are the blast radius of a compromised or tampered client. Legitimate play
-- should never come close; anything that does is either a bug or abuse, and
-- either way the caller finds out loudly.
--
-- shop_grant is the outlier, and deliberately so: buying a coin pack with
-- gems credits a lot of coins, but it is always paired with a debit that
-- already happened. Moving shop prices server-side is the remaining step
-- (see docs/IOS_LAUNCH_PLAN.md); until then its ceiling is generous.

CREATE TABLE IF NOT EXISTS public.currency_grant_limits (
  kind             text PRIMARY KEY,
  max_coins_call   integer NOT NULL,
  max_gems_call    integer NOT NULL,
  max_coins_day    integer NOT NULL,
  max_gems_day     integer NOT NULL
);

ALTER TABLE public.currency_grant_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Limits are readable"
  ON public.currency_grant_limits FOR SELECT
  USING (true);

INSERT INTO public.currency_grant_limits
  (kind,          max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('quiz_reward',           2000,             0,         20000,            0),
  ('level_up',               500,             0,          5000,            0),
  ('stake_win',             2000,             0,         20000,            0),
  ('spin',                   500,             2,          5000,           10),
  ('chest',                  250,             2,          1000,            5),
  ('mission',               1000,             5,         10000,           30),
  ('ad_reward',              500,             0,          2500,            0),
  ('shop_grant',          200000,           500,       1000000,         2000),
  ('feed_trivia',            500,             0,          5000,            0)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;

-- ── 3. Credits become debit-only for clients ───────────────────────────────
--
-- Positive deltas from a signed-in caller are refused outright. The service
-- role (auth.uid() is null) keeps full access, which is what edge functions
-- and the claim functions below rely on.

CREATE OR REPLACE FUNCTION public.update_user_currency(
  p_user_id uuid,
  p_coins_delta integer DEFAULT 0,
  p_gems_delta integer DEFAULT 0
)
RETURNS TABLE (new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_coins integer;
  v_current_gems integer;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NOT NULL THEN
    IF v_caller <> p_user_id THEN
      RAISE EXCEPTION 'Cannot modify another user''s balance';
    END IF;

    IF p_coins_delta > 0 OR p_gems_delta > 0 THEN
      RAISE EXCEPTION
        'Credits must go through a grant function (claim_daily_reward, '
        'claim_leaderboard_reward, exchange_currency, credit_gameplay_reward)';
    END IF;
  END IF;

  SELECT coins, gems INTO v_current_coins, v_current_gems
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  IF v_current_coins + p_coins_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  IF v_current_gems + p_gems_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  UPDATE profiles
  SET coins = v_current_coins + p_coins_delta,
      gems  = v_current_gems + p_gems_delta,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING coins, gems INTO new_coins, new_gems;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_currency(uuid, integer, integer) TO authenticated;

-- ── 4. The internal credit primitive ───────────────────────────────────────
--
-- Not granted to anyone. Everything below calls it; it applies the balance
-- change and records the ledger row in the same transaction, so a grant can
-- never exist without its receipt.

CREATE OR REPLACE FUNCTION public.apply_currency_grant(
  p_user_id uuid,
  p_kind text,
  p_coins integer,
  p_gems integer,
  p_reference text DEFAULT NULL
)
RETURNS TABLE (new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_coins < 0 OR p_gems < 0 THEN
    RAISE EXCEPTION 'A grant cannot be negative';
  END IF;

  UPDATE profiles
  SET coins = coins + p_coins,
      gems  = gems + p_gems,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING coins, gems INTO new_coins, new_gems;

  IF new_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (p_user_id, p_kind, p_coins, p_gems, p_reference);

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_currency_grant(uuid, text, integer, integer, text) FROM public;

-- ── 5. Bounded gameplay rewards ────────────────────────────────────────────
--
-- The honest compromise. Quiz payouts, level-ups and spins depend on a game
-- the server does not replay, so the amount still arrives from the client —
-- but it is checked against the ceilings above, counted against a daily
-- total, and written to the ledger.
--
-- This converts "unlimited currency, instantly, invisibly" into "at most the
-- daily cap for one category, and every unit of it recorded". Making these
-- fully authoritative needs server-side scoring, which is tracked separately.

CREATE OR REPLACE FUNCTION public.credit_gameplay_reward(
  p_kind text,
  p_coins integer DEFAULT 0,
  p_gems integer DEFAULT 0,
  p_reference text DEFAULT NULL
)
RETURNS TABLE (new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit   public.currency_grant_limits%ROWTYPE;
  v_day_coins integer;
  v_day_gems  integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_coins < 0 OR p_gems < 0 THEN
    RAISE EXCEPTION 'A reward cannot be negative';
  END IF;

  IF p_coins = 0 AND p_gems = 0 THEN
    SELECT coins, gems INTO new_coins, new_gems FROM profiles WHERE user_id = v_user_id;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_limit FROM public.currency_grant_limits WHERE kind = p_kind;

  IF v_limit.kind IS NULL THEN
    -- An unrecognised kind is a bug or a probe. Either way, no.
    RAISE EXCEPTION 'Unknown reward kind: %', p_kind;
  END IF;

  IF p_coins > v_limit.max_coins_call OR p_gems > v_limit.max_gems_call THEN
    RAISE EXCEPTION 'Reward of % coins / % gems exceeds the per-award limit for %',
      p_coins, p_gems, p_kind;
  END IF;

  SELECT COALESCE(SUM(coins), 0), COALESCE(SUM(gems), 0)
    INTO v_day_coins, v_day_gems
    FROM public.currency_grants
   WHERE user_id = v_user_id
     AND kind = p_kind
     AND created_at >= date_trunc('day', now());

  IF v_day_coins + p_coins > v_limit.max_coins_day
     OR v_day_gems + p_gems > v_limit.max_gems_day THEN
    RAISE EXCEPTION 'Daily % limit reached', p_kind;
  END IF;

  RETURN QUERY
    SELECT * FROM public.apply_currency_grant(v_user_id, p_kind, p_coins, p_gems, p_reference);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_gameplay_reward(text, integer, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.credit_gameplay_reward(text, integer, integer, text) TO authenticated;

-- ── 6. Daily reward, decided entirely here ─────────────────────────────────
--
-- The client used to read a 7-day table out of its own bundle, multiply by a
-- VIP bonus it also computed, mark the day claimed, and then credit itself.
-- Now it asks, and this decides: which day of the streak, what that day pays,
-- whether PRO Plus applies, and whether today was already claimed.
--
-- The amounts are the ones the app actually grants today — the local array in
-- DailyRewardsModal, not REWARDS.DAILY_REWARDS in rewardConfig, which had
-- drifted to entirely different numbers and is unused for granting.

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS TABLE (coins_awarded integer, gems_awarded integer, streak integer, new_coins integer, new_gems integer)
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

  -- Day 1..7 of the cycle, matching the client's
  -- `Math.min((currentStreak - 1) % 7, 6)` card selection.
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

  -- PRO Plus gets +50%, matching getDailyRewardMultiplier(). Checked against
  -- the subscription table rather than taken on the client's word.
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
      v_user_id, 'daily_reward', v_coins, v_gems, 'day ' || v_day::text);

  coins_awarded := v_coins;
  gems_awarded  := v_gems;
  streak        := v_streak;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

-- ── 7. Weekly leaderboard reward, claimed atomically ───────────────────────
--
-- The amount was always the server's — it sits in coins_rewarded/gems_rewarded
-- on the row. The client was only relaying it, across four separate round
-- trips with a hand-written rollback if the credit failed after the claim
-- stuck. One statement, one transaction, no rollback path to get wrong.

CREATE OR REPLACE FUNCTION public.claim_leaderboard_reward(p_reward_id uuid)
RETURNS TABLE (coins_awarded integer, gems_awarded integer, new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reward  public.category_weekly_rewards%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ownership and the unclaimed check are the same statement, so a double
  -- tap cannot pass both.
  UPDATE public.category_weekly_rewards
     SET claimed_at = now()
   WHERE id = p_reward_id
     AND user_id = v_user_id
     AND claimed_at IS NULL
  RETURNING * INTO v_reward;

  IF v_reward.id IS NULL THEN
    RAISE EXCEPTION 'Reward not found, not yours, or already claimed';
  END IF;

  IF v_reward.frame_rewarded IS NOT NULL THEN
    INSERT INTO public.user_leaderboard_frames (user_id, frame_id, category_id, week_earned)
    VALUES (v_user_id, v_reward.frame_rewarded, v_reward.category_id, v_reward.week_start_date)
    ON CONFLICT (user_id, frame_id, category_id) DO NOTHING;
  END IF;

  IF v_reward.badge_rewarded IS NOT NULL THEN
    UPDATE public.user_leaderboard_badges
       SET times_earned = times_earned + 1
     WHERE user_id = v_user_id
       AND badge_id = v_reward.badge_rewarded
       AND category_id = v_reward.category_id;

    IF NOT FOUND THEN
      INSERT INTO public.user_leaderboard_badges (user_id, badge_id, category_id, week_earned)
      VALUES (v_user_id, v_reward.badge_rewarded, v_reward.category_id, v_reward.week_start_date);
    END IF;
  END IF;

  SELECT * INTO new_coins, new_gems
    FROM public.apply_currency_grant(
      v_user_id, 'leaderboard_reward',
      v_reward.coins_rewarded, v_reward.gems_rewarded,
      p_reward_id::text);

  coins_awarded := v_reward.coins_rewarded;
  gems_awarded  := v_reward.gems_rewarded;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_leaderboard_reward(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_leaderboard_reward(uuid) TO authenticated;

-- ── 8. Exchange, at a rate the server sets ─────────────────────────────────
--
-- The client debited one currency and credited the other in two calls, with
-- both amounts of its own choosing — so one gem could have bought any number
-- of coins. The rate is REWARDS.GEM_TO_COINS_RATE, 500:1, and it lives here
-- now. Debit and credit share a transaction, which also removes the failure
-- mode where the spend succeeded and the credit did not.

CREATE OR REPLACE FUNCTION public.exchange_currency(
  p_direction text,   -- 'gems_to_coins' | 'coins_to_gems'
  p_amount integer    -- amount of the currency being given up
)
RETURNS TABLE (new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rate constant integer := 500;
  v_coins_delta integer;
  v_gems_delta integer;
  v_current_coins integer;
  v_current_gems integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Exchange amount must be positive';
  END IF;

  IF p_direction = 'gems_to_coins' THEN
    v_gems_delta  := -p_amount;
    v_coins_delta := p_amount * v_rate;
  ELSIF p_direction = 'coins_to_gems' THEN
    -- Integer division on purpose: a partial gem is not a gem. The client
    -- floors the same way when it previews the result.
    IF p_amount < v_rate THEN
      RAISE EXCEPTION 'Need at least % coins to get a gem', v_rate;
    END IF;
    v_gems_delta  := p_amount / v_rate;
    -- Charge only for whole gems, so no remainder is quietly swallowed.
    v_coins_delta := -(v_gems_delta * v_rate);
  ELSE
    RAISE EXCEPTION 'Unknown exchange direction: %', p_direction;
  END IF;

  SELECT coins, gems INTO v_current_coins, v_current_gems
    FROM profiles WHERE user_id = v_user_id FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_current_coins + v_coins_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  IF v_current_gems + v_gems_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  UPDATE profiles
     SET coins = v_current_coins + v_coins_delta,
         gems  = v_current_gems + v_gems_delta,
         updated_at = now()
   WHERE user_id = v_user_id
  RETURNING coins, gems INTO new_coins, new_gems;

  -- Logged for completeness, but as a net-zero-value move rather than a
  -- grant: the caller paid for every unit of it.
  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (v_user_id, 'exchange',
          GREATEST(v_coins_delta, 0), GREATEST(v_gems_delta, 0), p_direction);

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.exchange_currency(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.exchange_currency(text, integer) TO authenticated;
