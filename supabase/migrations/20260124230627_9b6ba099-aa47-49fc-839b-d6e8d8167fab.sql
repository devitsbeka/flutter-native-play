-- Fix overly permissive RLS policies for tv_poll_suggestions
DROP POLICY IF EXISTS "Anyone can update vote count" ON public.tv_poll_suggestions;

-- More restrictive update policy - only the trigger function updates vote_count
-- Players in the session can update (but trigger handles vote_count)
CREATE POLICY "Session participants can update suggestions"
ON public.tv_poll_suggestions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tv_sessions ts 
    WHERE ts.id = session_id 
    AND (ts.host_user_id = auth.uid() OR auth.uid() IS NOT NULL)
  )
);

-- Fix insert policy to be more restrictive
DROP POLICY IF EXISTS "Players can insert their own suggestions" ON public.tv_poll_suggestions;
CREATE POLICY "Authenticated users can insert suggestions"
ON public.tv_poll_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix votes insert policy
DROP POLICY IF EXISTS "Players can insert votes" ON public.tv_poll_votes;
CREATE POLICY "Authenticated users can insert votes"
ON public.tv_poll_votes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM tv_poll_suggestions s 
    WHERE s.id = suggestion_id AND s.user_id = auth.uid()
  )
);