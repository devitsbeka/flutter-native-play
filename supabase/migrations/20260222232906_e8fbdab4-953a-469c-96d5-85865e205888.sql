
-- Fix user_sessions: grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;

-- Also ensure the UPDATE policy works correctly for sendBeacon (anon key)
-- The existing COALESCE approach is correct, but let's also add a policy
-- that allows updating by session ID for reliability
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
CREATE POLICY "Users can update own sessions" 
  ON public.user_sessions FOR UPDATE
  USING (
    user_id = COALESCE(auth.uid()::text, user_id)
  );
