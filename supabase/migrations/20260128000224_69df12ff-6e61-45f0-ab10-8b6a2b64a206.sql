-- Add DELETE policy for player_answers table
-- Host should be able to delete answers for their TV session

-- First, allow players to delete their own answers
CREATE POLICY "Players can delete their own answers"
ON player_answers
FOR DELETE
USING (auth.uid() = user_id);

-- Second, allow TV session hosts to delete any answers in their session
CREATE POLICY "TV session hosts can delete answers"
ON player_answers
FOR DELETE
USING (
  tv_session_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM tv_sessions ts
    WHERE ts.id = player_answers.tv_session_id
    AND ts.host_user_id = auth.uid()
  )
);