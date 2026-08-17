-- Multi-round rooms: the scoreboard's cumulative columns
-- (room_participants.total_score / total_rounds_played / total_wins) were
-- accumulated CLIENT-side, by the host's device only, one UPDATE per
-- participant row. That design fails three separate ways, and together they
-- are the "I'm at 0 points and 0 rounds after every round" bug:
--
--   1. RLS. The only UPDATE policy on room_participants is
--      auth.uid() = user_id, so the host's writes to every OTHER player's row
--      match 0 rows and "succeed" silently. Non-hosts could never accumulate.
--   2. Host-only. If the host's device never ran the results effect for a
--      round (left the screen early, errored, wasn't looking), NOBODY
--      accumulated that round — including the host.
--   3. No error handling. The totals loop sat at the end of a five-await
--      chain (coins, profile, room_games, history); any earlier failure
--      silently killed it for that round.
--
-- Same medicine as reset_room_participants (20260724120000): one
-- SECURITY DEFINER function, callable by ANY participant, idempotent per
-- round, doing the whole round-completion write-set atomically:
-- room_games completion snapshot, room_match_history row, and the
-- cumulative totals for every participant — computed from the live
-- room_participants.score the players' own devices wrote during play,
-- not from whichever client's possibly-stale snapshot got there first.

ALTER TABLE public.room_games
  ADD COLUMN IF NOT EXISTS totals_applied boolean NOT NULL DEFAULT false;

-- Found while testing this migration: reset_room_participants assigns its
-- text parameter straight into the participant_status ENUM column, which
-- Postgres refuses ("column status is of type participant_status but
-- expression is of type text"). The RPC has therefore FAILED on every round
-- start since it shipped; play survived only because the client falls back
-- to resetting its own row and every other device self-resets on round
-- entry. Recreated with the one cast it was missing.
CREATE OR REPLACE FUNCTION public.reset_room_participants(
  p_room_id uuid,
  p_status text DEFAULT 'playing'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF p_status NOT IN ('joined', 'playing') THEN
    RAISE EXCEPTION 'invalid status %', p_status;
  END IF;

  UPDATE public.room_participants
  SET score = 0,
      current_question = 0,
      status = p_status::public.participant_status,
      has_seen_results = false
  WHERE room_id = p_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_room_participants(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_room_participants(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_room_participants(uuid, text) TO authenticated;

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

  -- Every device on the results screen calls this; the first caller claims
  -- the round and every later call — other players, remounts, retries — is
  -- a no-op. The claim and the totals commit in the same transaction, so a
  -- round is applied exactly once or not at all.
  UPDATE public.room_games
  SET totals_applied = true
  WHERE id = p_game_id
    AND room_id = p_room_id
    AND totals_applied = false
  RETURNING id INTO v_claimed;

  IF v_claimed IS NULL THEN
    RETURN false;
  END IF;

  SELECT user_id INTO v_winner
  FROM public.room_participants
  WHERE room_id = p_room_id
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
  WHERE room_id = p_room_id;

  UPDATE public.room_games
  SET completed_at = now(),
      winner_user_id = v_winner,
      player_scores = v_scores
  WHERE id = p_game_id;

  INSERT INTO public.room_match_history (room_id, winner_user_id, player_scores)
  VALUES (p_room_id, v_winner, v_scores);

  UPDATE public.room_participants
  SET total_score = COALESCE(total_score, 0) + COALESCE(score, 0),
      total_rounds_played = COALESCE(total_rounds_played, 0) + 1,
      total_wins = COALESCE(total_wins, 0)
        + CASE WHEN user_id = v_winner THEN 1 ELSE 0 END,
      last_played_at = now()
  WHERE room_id = p_room_id;

  RETURN true;
END;
$$;

-- SECURITY DEFINER functions are granted to PUBLIC by default — close that
-- first, then grant exactly who may call it (AGENTS.md rule 3).
REVOKE ALL ON FUNCTION public.complete_room_round(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_room_round(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_room_round(uuid, uuid) TO authenticated;
