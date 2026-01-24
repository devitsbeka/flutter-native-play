-- Add suggester info to tv_session_queue to track who suggested each round
ALTER TABLE public.tv_session_queue 
ADD COLUMN IF NOT EXISTS suggester_user_id text,
ADD COLUMN IF NOT EXISTS suggester_nickname text,
ADD COLUMN IF NOT EXISTS suggester_avatar_url text;

-- Add current round suggester info to tv_sessions for quick access
ALTER TABLE public.tv_sessions
ADD COLUMN IF NOT EXISTS current_round_suggester_id text,
ADD COLUMN IF NOT EXISTS current_round_suggester_nickname text,
ADD COLUMN IF NOT EXISTS current_round_suggester_avatar_url text;