-- Round-start reset must affect ALL participants, but the RLS policy on
-- room_participants only lets each user update their own row, so the host's
-- client-side "reset everyone" writes silently no-op for other players
-- (stale finished/score state then corrupts follow-up rounds).
-- SECURITY DEFINER lets any room participant reset the round state atomically.
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
      status = p_status,
      has_seen_results = false
  WHERE room_id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_room_participants(uuid, text) TO authenticated;

-- The lobby has a "remove player" button for hosts, but no DELETE policy
-- allows it: the delete matches 0 rows and the UI falsely reports success.
CREATE POLICY "Host can remove room participants"
ON public.room_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = room_participants.room_id
      AND gr.host_user_id = auth.uid()
  )
);
