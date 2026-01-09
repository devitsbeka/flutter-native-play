-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.room_participants;

-- Create a new INSERT policy that allows:
-- 1. Users to join rooms themselves (auth.uid() = user_id)
-- 2. Room hosts to add invited participants
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
);