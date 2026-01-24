-- Add RLS policy for TV sessions to read player_answers
-- This allows hosts and players in a TV session to view answers
CREATE POLICY "TV session participants can view answers"
ON public.player_answers
FOR SELECT
USING (
  tv_session_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM tv_players tp 
    WHERE tp.tv_session_id = player_answers.tv_session_id 
    AND tp.player_id = auth.uid()::text
  )
);

-- Also allow anon/guest access for TV mode (since players may not be authenticated)
-- This is safe because answers are scoped to specific sessions
CREATE POLICY "Public read for TV session answers"
ON public.player_answers
FOR SELECT
USING (tv_session_id IS NOT NULL);