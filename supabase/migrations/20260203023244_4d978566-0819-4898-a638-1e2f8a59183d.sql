-- Add DELETE policy for room_questions
-- Allows the room host to delete questions from their room
CREATE POLICY "Host can delete room questions" 
ON public.room_questions
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms gr 
    WHERE gr.id = room_questions.room_id 
    AND gr.host_user_id = auth.uid()
  )
);