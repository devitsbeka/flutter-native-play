-- A room round is played for a pot, the same way a quick game is played for
-- a stake.
--
-- Until now the two economies were different games. A quick game costs 500
-- to lose and pays 500 to win — settle_quick_game (20260814120000) decides
-- both, server-side, once per match. A ROOM paid out of thin air: the
-- client worked out a number from placement and raw score
-- (calculateMultiplayerPayout) and credited itself. Nobody paid anything in,
-- so every room was free money, and the more people in it the more of it
-- there was.
--
-- The owner's rule is that a room works like a quick game: everybody at the
-- table puts 500 in, and the table is what gets paid out —
--
--     two players   winner takes the pot
--     three or more 70% / 20% / 10% to first, second and third
--
-- WHAT THIS IS AND IS NOT
--
-- It is zero-sum by construction: the pot is the sum of what was actually
-- collected, and what is paid out is that same number. Nothing is minted.
-- Rounding is given to first place rather than dropped, so the pot balances
-- to the coin.
--
-- Everyone stakes, PRO included. settle_quick_game exempts PRO from the
-- loss because there is nobody on the other side of it; here there is —
-- exempting PRO would mean the other players fund the PRO player's
-- winnings, which is not a subscription benefit, it is a transfer. PRO's
-- benefit stays what it is: unlimited plays.
--
-- A player who cannot cover the stake pays what they have, and the pot is
-- smaller. Every route into a room checks the stake up front, but a balance
-- moves between joining a room and finishing a round in it, and a debit
-- that would go below zero is worse than a short pot.
--
-- A room with one player in it is practice. No stake, no pot, no prize —
-- otherwise a solo "room" is a way to farm your own coins back with a fee
-- attached, and worse, a way to lose them for nothing.

-- ── the round's claim ──────────────────────────────────────────────────────
--
-- complete_room_round already claims `totals_applied` for the scoreboard
-- write-set. The pot needs a claim of its own: the two are called from the
-- same effect but must not be able to half-apply each other, and a round
-- whose totals landed before this migration existed must still be able to
-- settle its pot.

ALTER TABLE public.room_games
  ADD COLUMN IF NOT EXISTS stakes_applied boolean NOT NULL DEFAULT false;

-- ── the ledger kinds ───────────────────────────────────────────────────────
--
-- Ceilings of zero on the debit for the same reason `stake_loss` has them:
-- credit_gameplay_reward checks the per-call ceiling before it grants, so no
-- client can ever turn a debit kind into a credit. The prize carries the
-- same 20000/day as a quick-game win, and the day is counted NET of both
-- kinds — matched stakes and prizes moved nothing between them and should
-- not consume a ceiling meant to bound minting.

INSERT INTO public.currency_grant_limits
  (kind,         max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('room_stake',              0,             0,             0,            0),
  ('room_prize',           5000,             0,         20000,            0)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;

-- One stake and one prize per player per round.
CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_room_reference_unique
  ON public.currency_grants (user_id, kind, reference)
  WHERE kind IN ('room_stake', 'room_prize') AND reference IS NOT NULL;

-- ── the settlement ─────────────────────────────────────────────────────────

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
  -- Mirrored by REWARDS.GAME_STAKE in src/config/rewardConfig.ts, which
  -- src/__tests__/roomPot.test.ts checks against this file.
  v_stake    constant integer := 500;
  v_claimed  uuid;
  v_players  integer;
  v_pot      integer := 0;
  v_net_day  integer;
  v_ceiling  integer;
  v_headroom integer;
  v_prize    integer;
  v_paid     integer := 0;
  v_row      record;
  v_deltas   jsonb := '[]'::jsonb;
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

  -- Every device on the results screen calls this; the first claims the
  -- round and the rest are no-ops. The claim and the money commit in the
  -- same transaction, so a pot is settled exactly once or not at all.
  UPDATE public.room_games
     SET stakes_applied = true
   WHERE id = p_game_id
     AND room_id = p_room_id
     AND stakes_applied = false
  RETURNING id INTO v_claimed;

  IF v_claimed IS NULL THEN
    SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
    RETURN jsonb_build_object(
      'pot', 0, 'applied', 0, 'coins', COALESCE(v_balance, 0), 'reason', 'already_settled');
  END IF;

  -- Who was at the table. An invitation nobody accepted is not a player:
  -- it neither pays in nor can be paid out.
  SELECT count(*) INTO v_players
    FROM public.room_participants
   WHERE room_id = p_room_id AND status::text <> 'invited';

  IF v_players < 2 THEN
    SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
    RETURN jsonb_build_object(
      'pot', 0, 'applied', 0, 'coins', COALESCE(v_balance, 0), 'reason', 'practice');
  END IF;

  -- ── pass one: collect ───────────────────────────────────────────────────
  -- Before anything is paid out, so a prize can never inflate the stake of
  -- the player who won it.
  FOR v_row IN
    SELECT rp.user_id, LEAST(v_stake, GREATEST(COALESCE(p.coins, 0), 0)) AS take
      FROM public.room_participants rp
      JOIN public.profiles p ON p.user_id = rp.user_id
     WHERE rp.room_id = p_room_id AND rp.status::text <> 'invited'
     ORDER BY rp.user_id
  LOOP
    IF v_row.take > 0 THEN
      UPDATE public.profiles
         SET coins = GREATEST(0, coins - v_row.take), updated_at = now()
       WHERE user_id = v_row.user_id;

      INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
      VALUES (v_row.user_id, 'room_stake', -v_row.take, 0, p_game_id::text);

      v_pot := v_pot + v_row.take;
      v_deltas := v_deltas || jsonb_build_object('user_id', v_row.user_id, 'staked', v_row.take);
    END IF;
  END LOOP;

  -- ── pass two: pay ───────────────────────────────────────────────────────
  -- Ranked the same way complete_room_round picks its winner, so the pot and
  -- the scoreboard cannot disagree about who came first.
  FOR v_row IN
    SELECT rp.user_id,
           row_number() OVER (ORDER BY COALESCE(rp.score, 0) DESC, rp.joined_at ASC NULLS LAST) AS place
      FROM public.room_participants rp
     WHERE rp.room_id = p_room_id AND rp.status::text <> 'invited'
     ORDER BY COALESCE(rp.score, 0) DESC, rp.joined_at ASC NULLS LAST
     LIMIT 3
  LOOP
    IF v_players = 2 THEN
      v_prize := CASE WHEN v_row.place = 1 THEN v_pot ELSE 0 END;
    ELSE
      v_prize := CASE v_row.place
                   WHEN 1 THEN (v_pot * 70) / 100
                   WHEN 2 THEN (v_pot * 20) / 100
                   WHEN 3 THEN (v_pot * 10) / 100
                   ELSE 0
                 END;
      -- Integer division loses up to two coins; first place gets them, so
      -- what is paid out is exactly what was collected.
      IF v_row.place = 1 THEN
        v_prize := v_prize + (v_pot - ((v_pot * 70) / 100) - ((v_pot * 20) / 100) - ((v_pot * 10) / 100));
      END IF;
    END IF;

    IF v_prize > 0 THEN
      SELECT COALESCE(SUM(coins), 0) INTO v_net_day
        FROM public.currency_grants
       WHERE user_id = v_row.user_id
         AND kind IN ('room_stake', 'room_prize', 'stake_win', 'stake_loss')
         AND created_at >= date_trunc('day', now());

      SELECT max_coins_day INTO v_ceiling
        FROM public.currency_grant_limits WHERE kind = 'room_prize';
      v_ceiling := COALESCE(v_ceiling, 20000);

      -- Pay what fits rather than nothing: a refused prize burns coins that
      -- were really collected, and the ceiling is here to bound minting, not
      -- to confiscate a pot.
      v_headroom := GREATEST(0, v_ceiling - v_net_day);
      v_prize := LEAST(v_prize, v_headroom);
    END IF;

    IF v_prize > 0 THEN
      UPDATE public.profiles
         SET coins = coins + v_prize, updated_at = now()
       WHERE user_id = v_row.user_id;

      INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
      VALUES (v_row.user_id, 'room_prize', v_prize, 0, p_game_id::text);

      v_paid := v_paid + v_prize;
      v_deltas := v_deltas || jsonb_build_object(
        'user_id', v_row.user_id, 'place', v_row.place, 'prize', v_prize);
    END IF;
  END LOOP;

  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'pot', v_pot,
    'paid', v_paid,
    'players', v_players,
    'coins', COALESCE(v_balance, 0),
    'deltas', v_deltas,
    'reason', 'settled');

EXCEPTION WHEN unique_violation THEN
  -- Two devices raced the claim. The loser rolls back to the start, so
  -- re-reading the balance reports what the winner left behind.
  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'pot', 0, 'applied', 0, 'coins', COALESCE(v_balance, 0), 'reason', 'already_settled');
END;
$$;

-- A new SECURITY DEFINER function is executable by PUBLIC by default, and
-- this one moves balances.
REVOKE ALL ON FUNCTION public.settle_room_round(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_room_round(uuid, uuid) TO authenticated;
