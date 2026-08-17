-- Four flows whose client writes RLS has been silently reducing to zero-row
-- no-ops (an UPDATE/DELETE filtered out by RLS "succeeds" with no error):
--
-- 1. HOST TRANSFER never worked. leaveRoomPermanently promotes a new host by
--    updating game_rooms.host_user_id (allowed) and then setting is_host on
--    the NEW host's room_participants row — blocked, own-row-only policy.
--    Every room whose host left has host_user_id pointing at a player whose
--    participant row still says is_host = false: the room drops out of the
--    new host's "my parties", the crown vanishes from the scoreboard, and
--    TV mode routes them as a guest.
-- 2. A signed-in player could never claim the guest challenge_attempts row
--    they created before signing up (policy requires user_id = auth.uid(),
--    the row's user_id is NULL) — the score stayed orphaned.
-- 3. Same shape on tv_players: a guest row (user_id IS NULL) could never be
--    adopted by the same player once signed in, so they stayed
--    is_active = false and the round stopped waiting for their answers.
-- 4. tv_poll_suggestions DELETE is host-only, but the client offers players
--    "remove your own suggestion" — the row silently survived and popped
--    back on the next poll refresh.

-- ── 1. Atomic host transfer ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.transfer_room_host(
  p_room_id uuid,
  p_new_host uuid
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
    SELECT 1 FROM public.game_rooms
    WHERE id = p_room_id AND host_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'only the current host can hand the room over';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = p_new_host
  ) THEN
    RAISE EXCEPTION 'new host is not a participant of this room';
  END IF;

  UPDATE public.game_rooms
  SET host_user_id = p_new_host
  WHERE id = p_room_id;

  -- One statement fixes every crown: exactly the new host's row is true.
  UPDATE public.room_participants
  SET is_host = (user_id = p_new_host)
  WHERE room_id = p_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_room_host(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_room_host(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.transfer_room_host(uuid, uuid) TO authenticated;

-- ── 2. Claiming an ownerless challenge attempt ─────────────────────────────
-- Only rows with no owner can be claimed, and only as yourself.

DROP POLICY IF EXISTS "Signed-in players can claim ownerless attempts"
  ON public.challenge_attempts;
CREATE POLICY "Signed-in players can claim ownerless attempts"
ON public.challenge_attempts
FOR UPDATE
USING (user_id IS NULL)
WITH CHECK (user_id = auth.uid());

-- ── 3. Claiming your own guest tv_players row after signing in ─────────────
-- Same rule: only an ownerless row, and only as yourself.

DROP POLICY IF EXISTS "Signed-in players can claim their guest row"
  ON public.tv_players;
CREATE POLICY "Signed-in players can claim their guest row"
ON public.tv_players
FOR UPDATE
USING (user_id IS NULL AND auth.uid() IS NOT NULL)
WITH CHECK (user_id = auth.uid());

-- ── 4. Removing your own poll suggestion ───────────────────────────────────

DROP POLICY IF EXISTS "Players can remove their own poll suggestions"
  ON public.tv_poll_suggestions;
CREATE POLICY "Players can remove their own poll suggestions"
ON public.tv_poll_suggestions
FOR DELETE
USING (user_id = auth.uid());
