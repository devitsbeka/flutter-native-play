-- Score updates are absolute-value writes from the client, so two concurrent
-- writers (e.g. answer points on one device racing an observer bonus, or a
-- retried request landing late) clobber each other and scores drift out of
-- sync across players. This RPC applies an atomic delta to the caller's own
-- row instead; GREATEST(0, ...) keeps negative deltas from underflowing.
CREATE OR REPLACE FUNCTION public.increment_participant_score(
  p_room_id uuid,
  p_delta integer
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

  UPDATE public.room_participants
  SET score = GREATEST(0, score + p_delta)
  WHERE room_id = p_room_id
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_participant_score(uuid, integer) TO authenticated;
