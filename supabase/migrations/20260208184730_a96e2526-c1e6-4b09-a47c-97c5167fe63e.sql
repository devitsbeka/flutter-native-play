
-- Create user_sessions table for tracking detailed session data
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  entry_page TEXT,
  exit_page TEXT,
  pages_visited INTEGER DEFAULT 1,
  country_code TEXT,
  is_bounce BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy using existing has_role function
CREATE POLICY "Admins can read all sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow anyone to insert their own session (authenticated or anon)
CREATE POLICY "Anyone can insert sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update their own session (for session end)
CREATE POLICY "Users can update own sessions"
ON public.user_sessions
FOR UPDATE
USING (user_id = COALESCE(auth.uid()::text, user_id));

-- Create indexes for common queries
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions (user_id);
CREATE INDEX idx_user_sessions_session_start ON public.user_sessions (session_start DESC);
CREATE INDEX idx_user_sessions_is_bounce ON public.user_sessions (is_bounce) WHERE is_bounce = true;
CREATE INDEX idx_user_sessions_browser ON public.user_sessions (browser);
CREATE INDEX idx_user_sessions_device_type ON public.user_sessions (device_type);
