-- ============================================
-- Fix Guest Player Poll Participation
-- ============================================

-- 1. Drop existing restrictive policies on tv_poll_votes
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON public.tv_poll_votes;
DROP POLICY IF EXISTS "Players can delete their own votes" ON public.tv_poll_votes;

-- 2. Create new INSERT policy supporting both auth and guest users
CREATE POLICY "Session participants can insert votes" 
ON public.tv_poll_votes FOR INSERT 
WITH CHECK (
  -- Authenticated user inserting their own vote
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Guest player verified via tv_players session membership
  public.is_tv_session_participant(session_id, user_id::text)
);

-- 3. Create new DELETE policy supporting both auth and guest users
CREATE POLICY "Session participants can delete own votes" 
ON public.tv_poll_votes FOR DELETE 
USING (
  -- Authenticated user deleting their own vote
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Guest player verified via tv_players session membership
  public.is_tv_session_participant(session_id, user_id::text)
);