-- Two functions that let the client name a number, and one that could half
-- finish and still be recorded as done.


-- ── 1. A score delta is bounded by what a question can pay ─────────────────
--
-- increment_participant_score() checks that you are signed in and only
-- touches your own row, which reads like enough and is not: the amount is a
-- parameter. One call from any account:
--
--   SELECT increment_participant_score('<room>', 999999);
--     score after one call | 999999
--
-- so a room's result — and any leaderboard built from it — was whatever the
-- client felt like sending.
--
-- The ceiling is what one question can legitimately pay, from
-- src/utils/scoring.ts: 100 base + 15 seconds x 10 = 250, plus the 25 first
-- answer bonus. src/utils/__tests__/scoring.test.ts reads this file and fails
-- if the two drift, which is what makes clamping safe rather than a silent
-- cap waiting to bite.
--
-- Clamped rather than refused, deliberately. A raise would turn any future
-- scoring change into a room full of errors; a clamp keeps the game playable
-- and the test is what keeps the number honest. Negative deltas pass through:
-- like a debit, they can only cost the caller, and the existing GREATEST(0,…)
-- already stops them going below zero.

CREATE OR REPLACE FUNCTION public.increment_participant_score(
  p_room_id uuid,
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- 100 + 15 * 10 + 25. Mirrored by MAX_QUESTION_POINTS in scoring.ts.
  v_max_per_call constant integer := 275;
  v_delta integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  v_delta := LEAST(p_delta, v_max_per_call);

  UPDATE public.room_participants
  SET score = GREATEST(0, score + v_delta)
  WHERE room_id = p_room_id
    AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_participant_score(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_participant_score(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_participant_score(uuid, integer) TO authenticated;


-- ── 2. A PRO player's daily power-ups, claimed once and all together ───────
--
-- useDailyVipRewards granted four power-ups in a loop, checked none of the
-- four writes, and then marked the day claimed — that last write being the
-- only one it did check. A grant that failed left the player told they had
-- their daily powers, without them, and unable to claim again. The same
-- routine read a quantity and wrote it back, so two tabs claiming at once
-- lost one another's increment.
--
-- One call now: it decides what a day is worth, checks the subscription,
-- refuses a second claim on the same day, and does the whole thing in one
-- transaction. Nothing is marked claimed unless every power-up landed.

CREATE OR REPLACE FUNCTION public.claim_daily_vip_powers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := CURRENT_DATE;
  -- One of each, which is what VIP_DAILY_POWERUPS has always meant.
  v_powers text[] := ARRAY['freeze', '5050', 'replace', 'time-drain'];
  v_power text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vip_subscriptions s
     WHERE s.user_id = v_user_id AND s.expires_at > now()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_pro');
  END IF;

  -- The claim row is the lock: whoever inserts it first does the granting,
  -- and a second tab gets no row back and stops here.
  INSERT INTO public.user_daily_vip_rewards (user_id, reward_date, powers_claimed)
  VALUES (v_user_id, v_today, true)
  ON CONFLICT (user_id, reward_date) DO UPDATE
    SET powers_claimed = true
  WHERE public.user_daily_vip_rewards.powers_claimed IS NOT TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  FOREACH v_power IN ARRAY v_powers LOOP
    INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
    VALUES (v_user_id, v_power, 1)
    ON CONFLICT (user_id, power_up_type) DO UPDATE
      SET quantity = public.user_power_ups.quantity + 1,
          updated_at = now();
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'granted', to_jsonb(v_powers));
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_vip_powers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_vip_powers() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_vip_powers() TO authenticated;
