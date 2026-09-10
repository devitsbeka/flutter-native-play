-- The pot is honest: it is paid to the players who staked it, split the
-- way the table was told, and never burned.
--
-- settle_room_round (20261015100000 / 20261015100100) got four things
-- wrong, each found by playing the flow through:
--
--   1. A seat that could not cover the stake staked what it had - nothing,
--      if the balance was zero - and was still ranked for the prize. A
--      player could zero their coins, sit down for free and take the whole
--      pot the others funded. Now a seat is at the table for money only if
--      it can cover the full stake; the others play the round for practice,
--      exactly as a lone player always has. Under two such seats, nobody
--      pays and nobody is paid.
--   2. The prize was clamped by the winner's daily ceiling, and the clamp
--      could reach zero: the stakes were collected and the winner paid
--      nothing, the pot simply destroyed, while their screen showed a loss.
--      A room pot is other players' coins changing hands, not coins being
--      minted, so the ceiling has no business here. Every coin collected is
--      paid out, always.
--   3. Ties paid whoever joined first, which in a two-player room is always
--      the host. Tied seats now share the places they span: two tied at the
--      top of a two-player room take half each; two tied first among four
--      take (70 + 20) / 2 each and the third takes 10.
--   4. The observing host (host_is_observer) staked and could win without
--      answering a question. Observers are not at the table for money.
--
-- complete_room_round likewise counted invited seats as players when it
-- picked the winner and accrued rounds played onto them. Seated only.
--
-- And a read-only room_round_ledger, so a results screen wanting to SHOW
-- what an earlier round paid can ask without settling anything - the old
-- path called the settling function for every round of a match, and an
-- earlier round that had never been claimed got settled late, on scores
-- that had since been zeroed for the next round.

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
  -- Mirrored by REWARDS.GAME_STAKE in src/config/rewardConfig.ts.
  v_stake    constant integer := 500;
  v_claimed  uuid;
  v_observer uuid;
  v_eligible uuid[];
  v_players  integer;
  v_pot      integer := 0;
  v_paid     integer := 0;
  v_planned  integer := 0;
  v_row      record;
  v_prizes   jsonb := '[]'::jsonb;
  v_deltas   jsonb := '[]'::jsonb;
  v_prize    jsonb;
  v_amount   integer;
  v_first    uuid;
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
    v_deltas := public.room_round_deltas(p_game_id);
    SELECT COALESCE(SUM((d->>'staked')::int), 0) INTO v_pot
      FROM jsonb_array_elements(v_deltas) d;
    SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
    RETURN jsonb_build_object(
      'pot', v_pot, 'applied', 0, 'coins', COALESCE(v_balance, 0),
      'deltas', v_deltas, 'reason', 'already_settled');
  END IF;

  -- The observing host answers nothing and is not at the table for money.
  SELECT CASE WHEN g.host_is_observer IS TRUE THEN g.host_user_id END
    INTO v_observer
    FROM public.game_rooms g
   WHERE g.id = p_room_id;

  -- Who is at the table for money: seated (not an invitation nobody
  -- accepted), not the observer, and able to cover the whole stake. A seat
  -- that cannot cover it plays this round for practice - it pays nothing
  -- and is paid nothing - the same as a lone player always has.
  SELECT array_agg(rp.user_id)
    INTO v_eligible
    FROM public.room_participants rp
    JOIN public.profiles p ON p.user_id = rp.user_id
   WHERE rp.room_id = p_room_id
     AND rp.status::text <> 'invited'
     AND rp.user_id IS DISTINCT FROM v_observer
     AND COALESCE(p.coins, 0) >= v_stake;

  v_players := COALESCE(array_length(v_eligible, 1), 0);

  IF v_players < 2 THEN
    SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
    RETURN jsonb_build_object(
      'pot', 0, 'applied', 0, 'coins', COALESCE(v_balance, 0), 'reason', 'practice');
  END IF;

  -- ── pass one: collect the stake from every seat at the table ───────────
  FOR v_row IN
    SELECT u AS user_id FROM unnest(v_eligible) AS u ORDER BY u
  LOOP
    UPDATE public.profiles
       SET coins = GREATEST(0, coins - v_stake), updated_at = now()
     WHERE user_id = v_row.user_id;

    INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
    VALUES (v_row.user_id, 'room_stake', -v_stake, 0, p_game_id::text);

    v_pot := v_pot + v_stake;
    v_deltas := v_deltas || jsonb_build_object('user_id', v_row.user_id, 'staked', v_stake);
  END LOOP;

  -- ── pass two: split the pot by place, tied seats sharing their places ──
  --
  -- place is rank() over the score (ties share a place), tied is how many
  -- share it. A group at place P of size N spans places P .. P+N-1 and
  -- shares the sum of those places' percentages: 100 / 0 / 0 ... at two
  -- players, 70 / 20 / 10 / 0 ... at three or more.
  FOR v_row IN
    SELECT s.user_id,
           s.place,
           s.tied,
           (SELECT COALESCE(SUM(
              CASE
                WHEN v_players = 2 THEN CASE WHEN g.p = 1 THEN 100 ELSE 0 END
                ELSE CASE g.p WHEN 1 THEN 70 WHEN 2 THEN 20 WHEN 3 THEN 10 ELSE 0 END
              END), 0)
              FROM generate_series(s.place, s.place + s.tied - 1) AS g(p)) AS pct_sum
      FROM (
        SELECT rp.user_id,
               rp.joined_at,
               rank() OVER (ORDER BY COALESCE(rp.score, 0) DESC)              AS place,
               count(*) OVER (PARTITION BY COALESCE(rp.score, 0))             AS tied
          FROM public.room_participants rp
         WHERE rp.room_id = p_room_id
           AND rp.user_id = ANY (v_eligible)
      ) s
     ORDER BY s.place, s.joined_at ASC NULLS LAST, s.user_id
  LOOP
    IF v_first IS NULL THEN
      v_first := v_row.user_id;
    END IF;
    v_amount := (v_pot * v_row.pct_sum) / (100 * v_row.tied);
    v_planned := v_planned + v_amount;
    v_prizes := v_prizes || jsonb_build_object(
      'user_id', v_row.user_id, 'place', v_row.place, 'prize', v_amount);
  END LOOP;

  -- No coin collected is left behind: integer division's remainder goes to
  -- the first seat of the top group, so what is paid is what was staked.
  FOR v_prize IN SELECT * FROM jsonb_array_elements(v_prizes)
  LOOP
    v_amount := (v_prize->>'prize')::int;
    IF (v_prize->>'user_id')::uuid = v_first THEN
      v_amount := v_amount + (v_pot - v_planned);
    END IF;

    IF v_amount > 0 THEN
      UPDATE public.profiles
         SET coins = coins + v_amount, updated_at = now()
       WHERE user_id = (v_prize->>'user_id')::uuid;

      INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
      VALUES ((v_prize->>'user_id')::uuid, 'room_prize', v_amount, 0, p_game_id::text);

      v_paid := v_paid + v_amount;
      v_deltas := v_deltas || jsonb_build_object(
        'user_id', (v_prize->>'user_id')::uuid,
        'place', (v_prize->>'place')::int,
        'prize', v_amount);
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
  v_deltas := public.room_round_deltas(p_game_id);
  SELECT COALESCE(SUM((d->>'staked')::int), 0) INTO v_pot
    FROM jsonb_array_elements(v_deltas) d;
  SELECT coins INTO v_balance FROM public.profiles WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'pot', v_pot, 'applied', 0, 'coins', COALESCE(v_balance, 0),
    'deltas', v_deltas, 'reason', 'already_settled');
END;
$$;

REVOKE ALL ON FUNCTION public.settle_room_round(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_room_round(uuid, uuid) TO authenticated;

-- ── the round's record: seated players only ────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_room_round(
  p_room_id uuid,
  p_game_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed uuid;
  v_winner uuid;
  v_scores jsonb;
  v_observer uuid;
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
  SET totals_applied = true
  WHERE id = p_game_id
    AND room_id = p_room_id
    AND totals_applied = false
  RETURNING id INTO v_claimed;

  IF v_claimed IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.game_rooms
  SET is_public = false
  WHERE id = p_room_id
    AND is_public IS TRUE;

  SELECT CASE WHEN g.host_is_observer IS TRUE THEN g.host_user_id END
    INTO v_observer
    FROM public.game_rooms g
   WHERE g.id = p_room_id;

  -- The winner is a player who played: not an invitation nobody accepted,
  -- not the host who only watched.
  SELECT user_id INTO v_winner
  FROM public.room_participants
  WHERE room_id = p_room_id
    AND status::text <> 'invited'
    AND user_id IS DISTINCT FROM v_observer
  ORDER BY COALESCE(score, 0) DESC, joined_at ASC NULLS LAST
  LIMIT 1;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'nickname', nickname,
        'score', COALESCE(score, 0),
        'avatar_url', avatar_url
      )
      ORDER BY COALESCE(score, 0) DESC
    ),
    '[]'::jsonb
  )
  INTO v_scores
  FROM public.room_participants
  WHERE room_id = p_room_id
    AND status::text <> 'invited';

  UPDATE public.room_games
  SET completed_at = now(),
      winner_user_id = v_winner,
      player_scores = v_scores
  WHERE id = p_game_id;

  INSERT INTO public.room_match_history (room_id, winner_user_id, player_scores)
  VALUES (p_room_id, v_winner, v_scores);

  -- Rounds played, score and wins accrue to the seats that played them.
  UPDATE public.room_participants
  SET total_score = COALESCE(total_score, 0) + COALESCE(score, 0),
      total_rounds_played = COALESCE(total_rounds_played, 0) + 1,
      total_wins = COALESCE(total_wins, 0)
        + CASE WHEN user_id = v_winner THEN 1 ELSE 0 END,
      last_played_at = now()
  WHERE room_id = p_room_id
    AND status::text <> 'invited';

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_room_round(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_room_round(uuid, uuid) TO authenticated;

-- ── the ledger, read without settling ──────────────────────────────────────
--
-- For a results screen that wants to show what an earlier round of the
-- match paid. It moves nothing: an unsettled round reports settled=false
-- and an empty ledger, and stays that way until its own settlement.

CREATE OR REPLACE FUNCTION public.room_round_ledger(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_room uuid;
  v_settled boolean;
  v_deltas jsonb;
  v_pot integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT room_id, stakes_applied INTO v_room, v_settled
    FROM public.room_games WHERE id = p_game_id;
  IF v_room IS NULL THEN
    RAISE EXCEPTION 'no such round';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = v_room AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant of this room';
  END IF;

  v_deltas := public.room_round_deltas(p_game_id);
  SELECT COALESCE(SUM((d->>'staked')::int), 0) INTO v_pot
    FROM jsonb_array_elements(v_deltas) d;

  RETURN jsonb_build_object(
    'settled', COALESCE(v_settled, false),
    'pot', v_pot,
    'deltas', v_deltas);
END;
$$;

REVOKE ALL ON FUNCTION public.room_round_ledger(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.room_round_ledger(uuid) TO authenticated;
