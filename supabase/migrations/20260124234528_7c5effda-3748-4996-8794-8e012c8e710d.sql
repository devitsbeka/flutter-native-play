-- Drop existing policies that don't work for guests
DROP POLICY IF EXISTS "TV session participants can insert suggestions" ON public.tv_poll_suggestions;
DROP POLICY IF EXISTS "Players can delete their own suggestions" ON public.tv_poll_suggestions;

-- Create INSERT policy that works for BOTH authenticated and guest players
-- For guests, we validate their user_id matches a player_id registered in the session
CREATE POLICY "Session participants can insert suggestions" 
ON public.tv_poll_suggestions 
FOR INSERT 
WITH CHECK (
  -- Authenticated user inserting for themselves
  (auth.uid() = user_id)
  OR
  -- Guest player: validate user_id is a registered player_id in this session
  EXISTS (
    SELECT 1 FROM tv_players tp
    WHERE tp.tv_session_id = session_id
    AND tp.player_id = user_id::text
  )
);

-- Create DELETE policy with same logic
CREATE POLICY "Session participants can delete own suggestions" 
ON public.tv_poll_suggestions 
FOR DELETE 
USING (
  (auth.uid() = user_id)
  OR
  EXISTS (
    SELECT 1 FROM tv_players tp
    WHERE tp.tv_session_id = session_id
    AND tp.player_id = user_id::text
  )
);