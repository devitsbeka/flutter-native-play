-- A solo picture game — the Guess card — is a staked game at its own price.
--
-- The card said 500 and charged nothing: a pick sent the player into the
-- category's own level, which has never had a stake. The owner's rule for
-- it is a smaller one than a match: "guess game cost should be 200 instead
-- 500, player plays solo and wins +200 if wins, -200 if looses".
--
-- settle_quick_game is that shape exactly — the client names the outcome
-- and a reference, never an amount; the function decides what a win and a
-- loss are worth, floors the debit at the balance, counts the day's ceiling
-- against the NET of wins and losses, and applies each reference once. So
-- this is that function at 200, under the same ledger kinds, so one daily
-- ceiling covers both games and the same partial unique index makes a
-- second settlement of one run a no-op. Mirrored by REWARDS.GUESS_STAKE in
-- src/config/rewardConfig.ts, which src/__tests__/guessStake.test.ts checks
-- against this file.

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
  v_stake   constant integer := 200;
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
    -- The stake or the balance, whichever is smaller; nothing below zero.
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
  -- Two settlements of one run raced; the loser reports the winner's balance.
  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  RETURN jsonb_build_object('applied', 0, 'coins', v_balance, 'reason', 'already_settled');
END;
$$;

-- A new SECURITY DEFINER function is granted to PUBLIC by default (CLAUDE.md
-- §3): signed-in players only.
REVOKE ALL ON FUNCTION public.settle_guess_game(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_guess_game(text, text) TO authenticated;
