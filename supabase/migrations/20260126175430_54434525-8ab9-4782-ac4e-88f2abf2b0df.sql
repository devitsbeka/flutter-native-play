-- Fix: Allow hosts to update any player in their TV session
-- This resolves the issue where hosts couldn't update guest player records
-- because the RLS policy required auth.uid() = user_id (which is NULL for guests)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Players can update their own record" ON public.tv_players;

-- Create new policy that allows:
-- 1. Players to update their own record (existing behavior)
-- 2. Hosts to update ANY player in their session (new capability)
CREATE POLICY "Players can update their own record" 
ON public.tv_players FOR UPDATE 
USING (
  -- Authenticated users update their own record
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Guest users update records with null user_id
  (auth.uid() IS NULL AND user_id IS NULL)
  OR
  -- Hosts can update ANY player in their session
  EXISTS (
    SELECT 1 FROM tv_sessions ts
    WHERE ts.id = tv_players.tv_session_id
    AND ts.host_user_id = auth.uid()
  )
);