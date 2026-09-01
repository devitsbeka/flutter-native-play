-- Any seated player can invite a friend, not just the host.
--
-- The lounges' + seats promise exactly that ("invited players can invite
-- their friends"), but the room_participants INSERT policy allowed only
-- self-joins and the HOST adding rows — a guest's invite failed RLS, and
-- with app toasts muted by design it failed in complete silence.
--
-- The widening is deliberately narrow: a seated human (joined/ready/
-- playing) may add rows to their room ONLY as invitations — status
-- 'invited', not a host, not a bot. Sitting somebody straight into a
-- playing seat, crowning them, or seeding bots stays the host's alone
-- (and the lobby RPCs'). Self-join and the host's power are unchanged.

DROP POLICY IF EXISTS "Users can join or be invited to rooms" ON public.room_participants;

CREATE POLICY "Users can join or be invited to rooms"
ON public.room_participants
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = room_id AND gr.host_user_id = auth.uid()
  )
  OR (
    status = 'invited'
    AND COALESCE(is_bot, false) = false
    AND COALESCE(is_host, false) = false
    AND EXISTS (
      SELECT 1 FROM public.room_participants me
      WHERE me.room_id = room_participants.room_id
        AND me.user_id = auth.uid()
        AND me.status IN ('joined', 'ready', 'playing')
        AND NOT COALESCE(me.is_bot, false)
    )
  )
);
