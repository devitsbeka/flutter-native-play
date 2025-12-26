-- Update max_players default to 10 and add min_players column
ALTER TABLE public.game_rooms ALTER COLUMN max_players SET DEFAULT 10;

-- Add min_players column (minimum 2 players to start)
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS min_players integer DEFAULT 2;