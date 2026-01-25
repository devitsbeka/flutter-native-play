-- ============================================
-- Simplify Poll RLS: Host-Only Suggestions
-- ============================================

-- 1. Drop all existing tv_poll_suggestions policies
DROP POLICY IF EXISTS "Anyone can view poll suggestions for active sessions" ON public.tv_poll_suggestions;
DROP POLICY IF EXISTS "Session participants can delete own suggestions" ON public.tv_poll_suggestions;
DROP POLICY IF EXISTS "Session participants can insert suggestions" ON public.tv_poll_suggestions;
DROP POLICY IF EXISTS "Session participants can update suggestions" ON public.tv_poll_suggestions;
DROP POLICY IF EXISTS "Session participants can view suggestions" ON public.tv_poll_suggestions;
DROP POLICY IF EXISTS "Users can delete own suggestions" ON public.tv_poll_suggestions;

-- 2. Simple policies for tv_poll_suggestions: Anyone can view, only host can modify
CREATE POLICY "Anyone can view suggestions" 
ON public.tv_poll_suggestions FOR SELECT 
USING (true);

CREATE POLICY "Host can insert suggestions" 
ON public.tv_poll_suggestions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tv_sessions ts 
    WHERE ts.id = session_id AND ts.host_user_id = auth.uid()
  )
);

CREATE POLICY "Host can delete suggestions" 
ON public.tv_poll_suggestions FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM tv_sessions ts 
    WHERE ts.id = session_id AND ts.host_user_id = auth.uid()
  )
);

-- 3. Drop all existing tv_poll_votes policies  
DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.tv_poll_votes;
DROP POLICY IF EXISTS "Session participants can delete own votes" ON public.tv_poll_votes;
DROP POLICY IF EXISTS "Session participants can insert votes" ON public.tv_poll_votes;
DROP POLICY IF EXISTS "Session participants can view votes" ON public.tv_poll_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON public.tv_poll_votes;

-- 4. Simple vote policies: Open read/write, app-layer validation
CREATE POLICY "Anyone can view votes" 
ON public.tv_poll_votes FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert votes" 
ON public.tv_poll_votes FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete votes" 
ON public.tv_poll_votes FOR DELETE 
USING (true);