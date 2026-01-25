-- ============================================
-- Fix Guest Poll Participation RLS Policies
-- ============================================

-- 1. Fix tv_poll_suggestions INSERT policy for guests
DROP POLICY IF EXISTS "Session participants can insert suggestions" ON public.tv_poll_suggestions;

CREATE POLICY "Session participants can insert suggestions" 
ON public.tv_poll_suggestions FOR INSERT 
WITH CHECK (
  -- Authenticated users
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Guest users: verify they are session participants (cast uuid to text for function)
  (auth.uid() IS NULL AND public.is_tv_session_participant(session_id, user_id::text))
);

-- 2. Fix tv_poll_suggestions DELETE policy for guests
DROP POLICY IF EXISTS "Users can delete own suggestions" ON public.tv_poll_suggestions;

CREATE POLICY "Users can delete own suggestions" 
ON public.tv_poll_suggestions FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.uid() IS NULL AND public.is_tv_session_participant(session_id, user_id::text))
);

-- 3. Fix tv_poll_votes INSERT policy for guests
DROP POLICY IF EXISTS "Session participants can insert votes" ON public.tv_poll_votes;

CREATE POLICY "Session participants can insert votes" 
ON public.tv_poll_votes FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.uid() IS NULL AND public.is_tv_session_participant(session_id, user_id::text))
);

-- 4. Fix tv_poll_votes DELETE policy for guests
DROP POLICY IF EXISTS "Users can delete own votes" ON public.tv_poll_votes;

CREATE POLICY "Users can delete own votes" 
ON public.tv_poll_votes FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.uid() IS NULL AND public.is_tv_session_participant(session_id, user_id::text))
);

-- 5. Ensure SELECT policies allow reading for session participants
DROP POLICY IF EXISTS "Session participants can view suggestions" ON public.tv_poll_suggestions;

CREATE POLICY "Session participants can view suggestions" 
ON public.tv_poll_suggestions FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  OR
  public.is_tv_session_participant(session_id, user_id::text)
);

DROP POLICY IF EXISTS "Session participants can view votes" ON public.tv_poll_votes;

CREATE POLICY "Session participants can view votes" 
ON public.tv_poll_votes FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  OR
  public.is_tv_session_participant(session_id, user_id::text)
);