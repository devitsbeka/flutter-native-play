-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert suggestions" ON public.tv_poll_suggestions;

-- Create a new INSERT policy that allows TV session participants to insert suggestions
-- This includes both authenticated users (matching their user_id) and participants tracked in tv_players
CREATE POLICY "TV session participants can insert suggestions" 
ON public.tv_poll_suggestions 
FOR INSERT 
WITH CHECK (
  -- User is authenticated and inserting their own suggestion
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- User is a registered TV player in this session (for guest players)
  EXISTS (
    SELECT 1 FROM tv_players tp
    WHERE tp.tv_session_id = session_id
    AND (tp.user_id = user_id OR tp.player_id = user_id::text)
  )
);

-- Also update DELETE policy to handle guest players
DROP POLICY IF EXISTS "Players can delete their own suggestions" ON public.tv_poll_suggestions;

CREATE POLICY "Players can delete their own suggestions" 
ON public.tv_poll_suggestions 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  EXISTS (
    SELECT 1 FROM tv_players tp
    WHERE tp.tv_session_id = session_id
    AND (tp.user_id = user_id OR tp.player_id = user_id::text)
  )
);