-- Add active_player_count column to tv_sessions for reliable player count tracking
ALTER TABLE public.tv_sessions ADD COLUMN IF NOT EXISTS active_player_count INTEGER DEFAULT 0;