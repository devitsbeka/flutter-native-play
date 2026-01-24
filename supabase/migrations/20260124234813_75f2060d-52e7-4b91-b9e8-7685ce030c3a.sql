-- Create a SECURITY DEFINER function to check if a user is a valid session participant
-- This bypasses RLS on tv_players table when checking
CREATE OR REPLACE FUNCTION public.is_tv_session_participant(p_session_id uuid, p_player_identifier text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tv_players tp
    WHERE tp.tv_session_id = p_session_id
    AND tp.player_id = p_player_identifier
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Session participants can insert suggestions" ON public.tv_poll_suggestions;
DROP POLICY IF EXISTS "Session participants can delete own suggestions" ON public.tv_poll_suggestions;

-- Create INSERT policy using the security definer function
CREATE POLICY "Session participants can insert suggestions" 
ON public.tv_poll_suggestions 
FOR INSERT 
WITH CHECK (
  -- Authenticated user inserting for themselves
  (auth.uid() = user_id)
  OR
  -- Guest player: use security definer function to check
  public.is_tv_session_participant(session_id, user_id::text)
);

-- Create DELETE policy with same logic
CREATE POLICY "Session participants can delete own suggestions" 
ON public.tv_poll_suggestions 
FOR DELETE 
USING (
  (auth.uid() = user_id)
  OR
  public.is_tv_session_participant(session_id, user_id::text)
);