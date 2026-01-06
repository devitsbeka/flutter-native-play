-- Create UPDATE policy that allows:
-- 1. Host to update their sessions
-- 2. Anyone to update unpaired TV-initiated sessions (for pairing)
CREATE POLICY "Can update tv_sessions" ON tv_sessions
FOR UPDATE
USING (
  auth.uid() = host_user_id 
  OR host_user_id IS NULL
);