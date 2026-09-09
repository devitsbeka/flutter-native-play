-- A public room is public once.
--
-- A room is listed on the Public tab so strangers can find a game. Once
-- that game has been played, the room is the players' own: they may keep
-- playing in it — rematches, new games — but it is a private room from
-- then on, and nothing can make it public again (owner: "public room is
-- public only once than it becomes private room with no ability to make
-- the room public again. players in it can play more but room stays
-- private").
--
-- The place a round's play is recorded is complete_room_round
-- (20260822120000): every device on the results screen calls it, the first
-- claims the round, and the write-set commits in one transaction. The flip
-- belongs in that write-set, so a public room turns private the moment its
-- first round is claimed — on every device, whoever's it is, and without
-- the host's RLS-gated client having to be the one that sees the round end.
--
-- Same function as 20260822120000 with one UPDATE added after the claim;
-- the rest is reproduced verbatim because CREATE OR REPLACE takes the whole
-- body. The lobby's Visibility switch is already gone (#683), so there is
-- no client path back to public either.

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

  -- Played once: a public room is the players' own from here on.
  UPDATE public.game_rooms
  SET is_public = false
  WHERE id = p_room_id
    AND is_public IS TRUE;

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

REVOKE ALL ON FUNCTION public.complete_room_round(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_room_round(uuid, uuid) TO authenticated;

-- ── the backlog ────────────────────────────────────────────────────────────
--
-- Every public room that has already had a round claimed is the players'
-- own now, the same as one played from here on.

UPDATE public.game_rooms r
   SET is_public = false
 WHERE r.is_public IS TRUE
   AND EXISTS (
     SELECT 1 FROM public.room_games g
      WHERE g.room_id = r.id AND g.totals_applied
   );
