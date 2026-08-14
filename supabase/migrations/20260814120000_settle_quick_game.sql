-- Settling a quick game becomes one decision, made here.
--
-- THE BUG THIS FIXES. A win is credited through `credit_gameplay_reward`,
-- which counts a day's `stake_win` grants against `max_coins_day` = 20000.
-- A loss is a debit and is counted against nothing. So the ceiling measures
-- only half of a symmetric rule, and a player who wins and loses in equal
-- number — whose net for the day is zero — is refused at their 41st win and
-- keeps paying for every loss after it. Reproduced against a real Postgres
-- with every migration applied, alternating win/loss from 600 coins:
--
--   win #41 refused: Daily stake_win limit reached  (balance still 600)
--   ... the loss that followed still took 500, and once the balance fell
--   below the stake the losses started failing too: "Insufficient coins"
--
-- From the player's seat that is exactly the report: "I played several
-- rounds but coins wouldn't change properly."
--
-- WHAT CHANGES. The ceiling now measures the NET of the day's settlements,
-- credits minus debits. It is unchanged as an anti-cheat control — a client
-- claiming nothing but wins still stops at 20000 for the day — but matched
-- wins and losses no longer count toward it, because together they moved
-- nothing.
--
-- Two other things move to the server while a settlement is one call:
--
--   * The amount. The client used to name it (`addCoins(500, 'stake_win')`).
--     Now it names the outcome and this decides what that is worth, so the
--     rule lives in one place instead of two that can drift.
--
--   * Settling twice. A match carries an id, and a settlement records it.
--     A second settlement of the same match is a no-op that returns the
--     balance, so a remounted result screen cannot pay a game twice.

-- The debit direction gets a ledger kind of its own, so a day's settlements
-- can be summed. Its ceilings are zero on purpose: `credit_gameplay_reward`
-- checks the per-call ceiling before it grants anything, so no client can
-- ever turn a debit kind into a credit.
INSERT INTO public.currency_grant_limits
  (kind,          max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('stake_loss',               0,             0,             0,            0)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;

-- One settlement per match. Partial, so the free-form `reference` on every
-- other kind of grant stays free-form.
CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_stake_reference_unique
  ON public.currency_grants (user_id, reference)
  WHERE kind IN ('stake_win', 'stake_loss') AND reference IS NOT NULL;

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
  -- Mirrored by REWARDS.GAME_STAKE / GAME_WIN_REWARD in
  -- src/config/rewardConfig.ts, which src/utils/__tests__/gameStake.test.ts
  -- checks against this file.
  v_stake   constant integer := 500;
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_net_day integer;
  v_ceiling integer;
  v_kind    text;
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

  IF p_reference IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.currency_grants
        WHERE user_id = v_user_id
          AND kind IN ('stake_win', 'stake_loss')
          AND reference = p_reference) THEN
    RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'already_settled');
  END IF;

  IF p_outcome = 'draw' THEN
    RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'draw');
  END IF;

  IF p_outcome = 'lose' THEN
    -- PRO players play for free. Decided here rather than taken from the
    -- client, which is the whole point of moving the amount server-side.
    IF EXISTS (SELECT 1 FROM public.vip_subscriptions s
                WHERE s.user_id = v_user_id AND s.expires_at > now()) THEN
      RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'vip_free');
    END IF;

    -- Take the stake or the balance, whichever is smaller. A player should
    -- never be here — every route into a game checks the stake is covered —
    -- but a balance can move between starting a game and finishing one, and
    -- a debit that would go below zero is refused outright, which used to
    -- mean nothing was taken while the screen announced -500.
    v_delta := -LEAST(v_stake, GREATEST(v_balance, 0));
    IF v_delta = 0 THEN
      RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'no_balance');
    END IF;
    v_kind := 'stake_loss';
  ELSE
    SELECT COALESCE(SUM(coins), 0) INTO v_net_day
      FROM public.currency_grants
     WHERE user_id = v_user_id
       AND kind IN ('stake_win', 'stake_loss')
       AND created_at >= date_trunc('day', now());

    SELECT max_coins_day INTO v_ceiling
      FROM public.currency_grant_limits WHERE kind = 'stake_win';
    v_ceiling := COALESCE(v_ceiling, 20000);

    IF v_net_day + v_stake > v_ceiling THEN
      -- Reported rather than raised: the game is over either way, and the
      -- screen shows what moved, which is nothing.
      RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'daily_cap');
    END IF;

    v_delta := v_stake;
    v_kind := 'stake_win';
  END IF;

  UPDATE public.profiles
     SET coins = GREATEST(0, coins + v_delta),
         updated_at = now()
   WHERE user_id = v_user_id
   RETURNING coins INTO v_balance;

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (v_user_id, v_kind, v_delta, 0, p_reference);

  RETURN jsonb_build_object('applied', v_delta, 'coins', v_balance, 'reason', 'settled');

EXCEPTION WHEN unique_violation THEN
  -- Two settlements of one match raced each other. The loser rolls back to
  -- the start of this function, so re-reading the balance reports the one
  -- the winner left behind.
  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'already_settled');
END;
$$;

-- A new SECURITY DEFINER function is executable by PUBLIC by default, and
-- this one moves balances.
REVOKE ALL ON FUNCTION public.settle_quick_game(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_quick_game(text, text) TO authenticated;
