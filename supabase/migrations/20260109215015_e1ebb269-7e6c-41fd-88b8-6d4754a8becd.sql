-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can insert their own answers" ON public.player_answers;

-- Create a more flexible INSERT policy for player_answers
-- This allows authenticated users to insert their own answers
-- OR allows inserts when there's an active TV session (for guest players)
CREATE POLICY "Players can insert answers" 
ON public.player_answers 
FOR INSERT 
WITH CHECK (
  -- Allow authenticated users to insert for themselves
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Allow inserts for TV sessions (guest players without auth)
  (tv_session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM tv_sessions ts 
    WHERE ts.id = player_answers.tv_session_id 
    AND ts.status IN ('playing', 'question', 'reveal')
  ))
  OR
  -- Allow inserts for game rooms (for any participant)
  (room_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM room_participants rp 
    WHERE rp.room_id = player_answers.room_id
  ))
);

-- Also add UPDATE policy for player answers
CREATE POLICY "Players can update their own answers" 
ON public.player_answers 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR 
  (tv_session_id IS NOT NULL)
);