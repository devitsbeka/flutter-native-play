-- Add security question columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS security_question_id INTEGER,
ADD COLUMN IF NOT EXISTS security_answer_hash TEXT;

-- Create table to track password reset attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on the attempts table
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow inserts from service role (edge function)
CREATE POLICY "Service role only" ON public.password_reset_attempts
FOR ALL USING (false);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_username_time 
ON public.password_reset_attempts(username, attempted_at DESC);