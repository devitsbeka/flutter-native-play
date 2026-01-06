-- Drop the existing INSERT policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can create tv_sessions" ON tv_sessions;
DROP POLICY IF EXISTS "Anyone can create tv_sessions" ON tv_sessions;

-- Create new policy that allows:
-- 1. Authenticated users to create their own sessions
-- 2. ANYONE (including unauthenticated TVs) to create sessions with null host_user_id
CREATE POLICY "Allow tv session creation" ON tv_sessions
FOR INSERT
WITH CHECK (
  -- Authenticated users creating their own session
  (auth.uid() IS NOT NULL AND auth.uid() = host_user_id)
  OR
  -- TV-initiated sessions (no auth required, host_user_id must be null)
  (host_user_id IS NULL)
);