-- A quick game costs 500 for everybody, PRO included.
--
-- settle_quick_game exempted an active subscriber from the loss and returned
-- 'vip_free'. The reasoning at the time (20260814120000) was that there is
-- nobody on the other side of a quick game, so nobody is funded by the
-- exemption — unlike a room, where the pot is the other players' money and
-- PRO has always staked like everyone else.
--
-- The owner's rule is one price: "per match cost is 500 coins, for PRO and
-- no PRO users, same ... give me sql to charge pro users too on quick games".
-- Two economies with two prices was the thing that made "what does a match
-- cost?" un-answerable in one sentence, and a subscriber now opens with
-- 25,000 coins and 10 gems (20261102100000), which is a better shape for the
-- benefit than an invisible discount on every loss.
--
-- WHAT PRO STILL IS: unlimited plays — the play limit and its regeneration
-- are untouched — plus the daily power-ups, the bonus spins, and the welcome
-- bundle. What it is not, any more, is a private price list.
--
-- Everything else in this function is unchanged and is reproduced verbatim,
-- because CREATE OR REPLACE takes the whole body: the once-per-match claim,
-- the debit floored at the balance, the daily ceiling on wins, and the race
-- that two devices settling one match can lose safely.

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
    -- No subscription branch here any more. One price, decided server-side,
    -- which is the whole point of the amount not coming from the client.

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

-- CREATE OR REPLACE keeps the existing grants, but state them anyway: this
-- function moves balances and the file should be readable on its own.
REVOKE ALL ON FUNCTION public.settle_quick_game(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_quick_game(text, text) TO authenticated;
