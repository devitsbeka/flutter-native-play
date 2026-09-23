-- MyTrivia is a trivia game, not a casino: nothing is staked, nothing is lost.
--
-- App Review rejected 1.0 (74) under the simulated-gambling rule: coins —
-- which gems buy, and gems are an in-app purchase — went into a game and
-- came out to whoever won it. A quick game cost 500 to lose and paid 500 to
-- win; a room collected 500 from every seat and paid the pot out by place;
-- the Guess card staked 200. That is a wager in every sense App Review means.
--
-- From here the house pays and nobody pays in. Same functions, same
-- signatures, same response shapes — so web, every build already on a phone
-- and the new one all stop wagering the moment this is applied:
--
--   settle_quick_game   win +200, draw +50, lose 0
--   settle_guess_game   pass +100, fail 0
--   settle_room_round   nothing collected; 1st/2nd/3rd get 200/100/50 from
--                       the house (1st only at two players), ties share
--
-- The amounts are mirrored in src/config/rewardConfig.ts (GAME_WIN_REWARD,
-- GAME_DRAW_REWARD, GUESS_WIN_REWARD, ROOM_PLACE_PRIZES), which
-- src/__tests__/noWagering.test.ts checks against this file.
--
-- A reward is now pure mint, so every one of them is inside a daily ceiling
-- (currency_grant_limits) — a win you can't lose is a win worth farming.

-- ── 1. A quick game ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.settle_quick_game(
  p_outcome   text,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win     constant integer := 200;
  v_draw    constant integer := 50;
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_day     integer;
  v_ceiling integer;
  v_delta   integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_outcome NOT IN ('win', 'lose', 'draw') THEN
    RAISE EXCEPTION 'Unknown game outcome: %', p_outcome;
  END IF;

  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', v_user_id;
  END IF;

  -- A loss costs nothing. There is no debit branch left to reach.
  IF p_outcome = 'lose' THEN
    RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'lose');
  END IF;

  IF p_reference IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.currency_grants
        WHERE user_id = v_user_id
          AND kind IN ('stake_win', 'stake_loss')
          AND reference = p_reference) THEN
    RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'already_settled');
  END IF;

  v_delta := CASE p_outcome WHEN 'win' THEN v_win ELSE v_draw END;

  -- Credits only count against the ceiling now: stake_loss rows from before
  -- this migration are history, not headroom.
  SELECT COALESCE(SUM(coins), 0) INTO v_day
    FROM public.currency_grants
   WHERE user_id = v_user_id
     AND kind = 'stake_win'
     AND coins > 0
     AND created_at >= date_trunc('day', now());

  SELECT max_coins_day INTO v_ceiling
    FROM public.currency_grant_limits WHERE kind = 'stake_win';
  v_ceiling := COALESCE(v_ceiling, 20000);

  IF v_day + v_delta > v_ceiling THEN
    RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'daily_cap');
  END IF;

  UPDATE public.profiles
     SET coins = coins + v_delta,
         updated_at = now()
   WHERE user_id = v_user_id
   RETURNING coins INTO v_balance;

  -- 'stake_win' is the ledger's name for a game reward and stays so: the
  -- limits row, the leaderboard's earning kinds and the idempotency check
  -- above all key on it. Nothing shows it to a player.
  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (v_user_id, 'stake_win', v_delta, 0, p_reference);

  RETURN jsonb_build_object('applied', v_delta, 'coins', v_balance, 'reason', 'settled');

EXCEPTION WHEN unique_violation THEN
  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'already_settled');
END;
$$;
REVOKE ALL ON FUNCTION public.settle_quick_game(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_quick_game(text, text) TO authenticated;

-- ── 2. The Guess card ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.settle_guess_game(
  p_outcome   text,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win     constant integer := 100;
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_day     integer;
  v_ceiling integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_outcome NOT IN ('win', 'lose', 'draw') THEN
    RAISE EXCEPTION 'Unknown game outcome: %', p_outcome;
  END IF;

  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', v_user_id;
  END IF;

  IF p_outcome <> 'win' THEN
    RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', p_outcome);
  END IF;

  IF p_reference IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.currency_grants
        WHERE user_id = v_user_id
          AND kind IN ('stake_win', 'stake_loss')
          AND reference = p_reference) THEN
    RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'already_settled');
  END IF;

  SELECT COALESCE(SUM(coins), 0) INTO v_day
    FROM public.currency_grants
   WHERE user_id = v_user_id
     AND kind = 'stake_win'
     AND coins > 0
     AND created_at >= date_trunc('day', now());

  SELECT max_coins_day INTO v_ceiling
    FROM public.currency_grant_limits WHERE kind = 'stake_win';
  v_ceiling := COALESCE(v_ceiling, 20000);

  IF v_day + v_win > v_ceiling THEN
    RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'daily_cap');
  END IF;

  UPDATE public.profiles
     SET coins = coins + v_win,
         updated_at = now()
   WHERE user_id = v_user_id
   RETURNING coins INTO v_balance;

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (v_user_id, 'stake_win', v_win, 0, p_reference);

  RETURN jsonb_build_object('applied', v_win, 'coins', v_balance, 'reason', 'settled');

EXCEPTION WHEN unique_violation THEN
  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'already_settled');
END;
$$;
REVOKE ALL ON FUNCTION public.settle_guess_game(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_guess_game(text, text) TO authenticated;

-- ── 3. A room round ─────────────────────────────────────────────────────────
--
-- 20261106110000's shape — claim the round once, rank the seated players,
-- tied seats share their places — with the collection pass gone. Prizes come
-- from the house. 'pot' is reported as 0 and every delta's 'staked' as 0 so
-- a build that still draws the pot line draws nothing to lose.

CREATE OR REPLACE FUNCTION public.settle_room_round(
  p_room_id uuid,
  p_game_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed  uuid;
  v_observer uuid;
  v_seated   uuid[];
  v_players  integer;
  v_paid     integer := 0;
  v_row      record;
  v_deltas   jsonb := '[]'::jsonb;
  v_amount   integer;
  v_day      integer;
  v_ceiling  integer;
  v_balance  integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant of this room';
  END IF;

  UPDATE public.room_games
     SET stakes_applied = true
   WHERE id = p_game_id
     AND room_id = p_room_id
     AND stakes_applied = false
  RETURNING id INTO v_claimed;

  IF v_claimed IS NULL THEN
    SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
    RETURN jsonb_build_object(
      'pot', 0, 'applied', 0, 'coins', COALESCE(v_balance, 0),
      'deltas', public.room_round_deltas(p_game_id), 'reason', 'already_settled');
  END IF;

  SELECT CASE WHEN g.host_is_observer IS TRUE THEN g.host_user_id END
    INTO v_observer
    FROM public.game_rooms g
   WHERE g.id = p_room_id;

  -- Everyone seated plays for the prizes. No balance is required to sit
  -- down, because sitting down costs nothing.
  SELECT array_agg(rp.user_id)
    INTO v_seated
    FROM public.room_participants rp
   WHERE rp.room_id = p_room_id
     AND rp.status::text <> 'invited'
     AND rp.user_id IS DISTINCT FROM v_observer;

  v_players := COALESCE(array_length(v_seated, 1), 0);

  IF v_players < 2 THEN
    SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
    RETURN jsonb_build_object(
      'pot', 0, 'applied', 0, 'coins', COALESCE(v_balance, 0), 'reason', 'practice');
  END IF;

  SELECT max_coins_day INTO v_ceiling
    FROM public.currency_grant_limits WHERE kind = 'room_prize';
  v_ceiling := COALESCE(v_ceiling, 20000);

  -- A group tied at place P, N strong, spans places P .. P+N-1 and shares
  -- the sum of those places' prizes: 200 / 0 at two players,
  -- 200 / 100 / 50 / 0 ... at three or more.
  FOR v_row IN
    SELECT s.user_id,
           s.place,
           s.tied,
           (SELECT COALESCE(SUM(
              CASE
                WHEN v_players = 2 THEN CASE WHEN g.p = 1 THEN 200 ELSE 0 END
                ELSE CASE g.p WHEN 1 THEN 200 WHEN 2 THEN 100 WHEN 3 THEN 50 ELSE 0 END
              END), 0)
              FROM generate_series(s.place, s.place + s.tied - 1) AS g(p)) AS prize_sum
      FROM (
        SELECT rp.user_id,
               rp.joined_at,
               rank() OVER (ORDER BY COALESCE(rp.score, 0) DESC)  AS place,
               count(*) OVER (PARTITION BY COALESCE(rp.score, 0)) AS tied
          FROM public.room_participants rp
         WHERE rp.room_id = p_room_id
           AND rp.user_id = ANY (v_seated)
      ) s
     ORDER BY s.place, s.joined_at ASC NULLS LAST, s.user_id
  LOOP
    v_amount := v_row.prize_sum / v_row.tied;

    IF v_amount > 0 THEN
      SELECT COALESCE(SUM(coins), 0) INTO v_day
        FROM public.currency_grants
       WHERE user_id = v_row.user_id
         AND kind = 'room_prize'
         AND created_at >= date_trunc('day', now());
      v_amount := LEAST(v_amount, GREATEST(0, v_ceiling - v_day));
    END IF;

    IF v_amount > 0 THEN
      UPDATE public.profiles
         SET coins = coins + v_amount, updated_at = now()
       WHERE user_id = v_row.user_id;

      INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
      VALUES (v_row.user_id, 'room_prize', v_amount, 0, p_game_id::text);

      v_paid := v_paid + v_amount;
    END IF;

    v_deltas := v_deltas || jsonb_build_object(
      'user_id', v_row.user_id, 'staked', 0, 'place', v_row.place, 'prize', v_amount);
  END LOOP;

  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'pot', 0,
    'paid', v_paid,
    'players', v_players,
    'coins', COALESCE(v_balance, 0),
    'deltas', v_deltas,
    'reason', 'settled');

EXCEPTION WHEN unique_violation THEN
  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'pot', 0, 'applied', 0, 'coins', COALESCE(v_balance, 0),
    'deltas', public.room_round_deltas(p_game_id), 'reason', 'already_settled');
END;
$$;
REVOKE ALL ON FUNCTION public.settle_room_round(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_room_round(uuid, uuid) TO authenticated;

-- ── 4. The ledger's own words ───────────────────────────────────────────────

UPDATE public.leaderboard_earning_kinds SET note = 'winning or drawing a game'  WHERE kind = 'stake_win';
UPDATE public.leaderboard_earning_kinds SET note = 'a room place prize'          WHERE kind = 'room_prize';
UPDATE public.leaderboard_earning_kinds SET note = 'retired — losses cost nothing since 20261108100000' WHERE kind IN ('stake_loss', 'room_stake');

-- ── 5. The daily reward is a calendar, not a roll ───────────────────────────
--
-- 20260913100000's claim_daily_reward rolled random() for a "surprise" on top
-- of the ladder: doubled coins, 1-5 gems or 1-3 power-ups, by chance. Free,
-- but a prize left to chance is exactly what a reviewer looking for
-- simulated gambling reads as a slot, so every day now pays the same thing
-- every week, and the card can say what it is before it is opened:
--
--     day     1        2        3      4       5      6            7
--     coins   50       75       100    125     150    200          300
--     plus    replace  freeze   1 gem  50/50   2 gems time-drain×2 5 gems
--
-- Coins and gems are REWARDS.DAILY_REWARDS exactly (gems on 3, 5 and 7).
-- Same signature, same receipt columns, same ledger reference format, PRO
-- Plus +50% as before.

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS TABLE (
  coins_awarded  integer,
  gems_awarded   integer,
  streak         integer,
  new_coins      integer,
  new_gems       integer,
  bonus          text,     -- 'gems' | 'power'
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
  v_power    text;
  v_power_n  integer := 0;
  v_reference text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
    FROM public.user_daily_rewards
   WHERE user_id = v_user_id AND reward_date = v_today
     FOR UPDATE;

  IF v_row.id IS NOT NULL AND v_row.daily_claimed THEN
    RAISE EXCEPTION 'Daily reward already claimed today';
  END IF;

  IF v_row.id IS NULL THEN
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

  v_day := ((v_streak - 1) % 7) + 1;

  SELECT t.c, t.g, t.p, t.n INTO v_coins, v_gems, v_power, v_power_n FROM (VALUES
    (1,  50, 0, 'replace',    1),
    (2,  75, 0, 'freeze',     1),
    (3, 100, 1, NULL,         0),
    (4, 125, 0, '5050',       1),
    (5, 150, 2, NULL,         0),
    (6, 200, 0, 'time-drain', 2),
    (7, 300, 5, NULL,         0)
  ) AS t(d, c, g, p, n) WHERE t.d = v_day;

  IF v_power IS NOT NULL THEN
    bonus := 'power';
    INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
    VALUES (v_user_id, v_power, v_power_n)
    ON CONFLICT (user_id, power_up_type)
    DO UPDATE SET quantity   = public.user_power_ups.quantity + EXCLUDED.quantity,
                  updated_at = now();
  ELSE
    bonus := 'gems';
  END IF;

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
REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

-- ── 6. The admin economy screen says the same ───────────────────────────────
--
-- Read by the admin screen and useEconomyConfig's defaults only; no
-- settlement reads these. Kept true so nobody raises a "stake" back from it.

DELETE FROM public.economy_config WHERE id IN ('game_stake', 'game_draw_refund');
INSERT INTO public.economy_config (id, value, category, description) VALUES
  ('game_win_reward',  200, 'game_rewards', 'Coins a quick-game win pays (nothing is staked)'),
  ('game_draw_reward',  50, 'game_rewards', 'Coins a quick-game draw pays')
ON CONFLICT (id) DO UPDATE
  SET value = EXCLUDED.value, category = EXCLUDED.category,
      description = EXCLUDED.description, updated_at = now();
