-- Every device on the results screen is told what moved — not just the
-- first one to ask.
--
-- settle_room_round (20261015100000) settles a round exactly once: the
-- first device to call it claims the round, collects the stakes, pays the
-- pot and hands back the deltas; every later call finds the claim taken
-- and answers `already_settled` with NO deltas. Which is correct about the
-- money and wrong about the screen: the client reads its own line off the
-- deltas, so the loser whose phone happened to call first saw "-200" and
-- the winner, calling a second later, saw nothing at all (owner: "i see one
-- player lose 200 coins but winner got nothing"). The coins had moved; the
-- winner was simply never told.
--
-- The ledger already knows. Every stake and every prize is a
-- currency_grants row keyed by the round's game id, and a SECURITY DEFINER
-- function can read it where the client cannot (currency_grants has no
-- SELECT policy for users, on purpose). So `already_settled` now carries
-- the same per-player deltas the first call did, read back from the
-- ledger, and the pot alongside — and the results screen can say what every
-- seat won or paid, whichever device is drawing it.
--
-- Nothing about the money changes. The claim, the split and the ceilings
-- are the ones the first migration wrote; only what is REPORTED is wider.

-- ── the ledger, per player ─────────────────────────────────────────────────
--
-- One row per player: what they staked (stored negative in the ledger,
-- returned positive here, the shape the first call already uses) and what
-- they were paid. Owner-only: it reads a table users cannot, and is reached
-- only through settle_room_round, which runs as the owner.

CREATE OR REPLACE FUNCTION public.room_round_deltas(p_game_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('user_id', user_id, 'staked', staked, 'prize', prize)
              ORDER BY prize DESC, user_id),
    '[]'::jsonb)
  FROM (
    SELECT user_id,
           SUM(CASE WHEN kind = 'room_stake' THEN -coins ELSE 0 END) AS staked,
           SUM(CASE WHEN kind = 'room_prize' THEN  coins ELSE 0 END) AS prize
      FROM public.currency_grants
     WHERE reference = p_game_id::text
       AND kind IN ('room_stake', 'room_prize')
     GROUP BY user_id
  ) ledger;
$$;

REVOKE ALL ON FUNCTION public.room_round_deltas(uuid) FROM PUBLIC, anon, authenticated;

-- ── the settlement, reporting to everyone ──────────────────────────────────

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
  -- src/__tests__/roomPot.test.ts checks against the first migration.
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
    -- Settled already — by another device, or by this one a moment ago.
    -- Report what the ledger holds for the round, so this screen can say
    -- what every seat won or paid, exactly as the first caller's could.
    v_deltas := public.room_round_deltas(p_game_id);
    SELECT COALESCE(SUM((d->>'staked')::int), 0) INTO v_pot
      FROM jsonb_array_elements(v_deltas) d;
    SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
    RETURN jsonb_build_object(
      'pot', v_pot, 'applied', 0, 'coins', COALESCE(v_balance, 0),
      'deltas', v_deltas, 'reason', 'already_settled');
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
  -- Two devices raced the claim. The loser rolls back to the start; the
  -- winner's ledger rows are what it reports.
  v_deltas := public.room_round_deltas(p_game_id);
  SELECT COALESCE(SUM((d->>'staked')::int), 0) INTO v_pot
    FROM jsonb_array_elements(v_deltas) d;
  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'pot', v_pot, 'applied', 0, 'coins', COALESCE(v_balance, 0),
    'deltas', v_deltas, 'reason', 'already_settled');
END;
$$;

-- A new SECURITY DEFINER function is executable by PUBLIC by default, and
-- this one moves balances.
REVOKE ALL ON FUNCTION public.settle_room_round(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_room_round(uuid, uuid) TO authenticated;
