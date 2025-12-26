-- Create game_type enum
CREATE TYPE public.game_type AS ENUM ('realtime', 'async');

-- Add columns to game_rooms for async challenges
ALTER TABLE public.game_rooms 
ADD COLUMN game_type public.game_type NOT NULL DEFAULT 'realtime',
ADD COLUMN challenge_expires_at timestamp with time zone,
ADD COLUMN challenger_completed_at timestamp with time zone,
ADD COLUMN challenged_user_id uuid;

-- Create index for finding pending async challenges
CREATE INDEX idx_game_rooms_async_challenges ON public.game_rooms(challenged_user_id, game_type, status) 
WHERE game_type = 'async' AND status IN ('waiting', 'playing');

-- Comment for documentation
COMMENT ON COLUMN public.game_rooms.game_type IS 'Type of game: realtime (sync play) or async (play at different times)';
COMMENT ON COLUMN public.game_rooms.challenge_expires_at IS 'Expiration time for async challenges';
COMMENT ON COLUMN public.game_rooms.challenger_completed_at IS 'When the original challenger completed their game';
COMMENT ON COLUMN public.game_rooms.challenged_user_id IS 'The user being challenged in async games';