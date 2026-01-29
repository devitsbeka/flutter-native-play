-- Add game_id to room_questions for round validation
-- This ensures non-host players can verify they have the correct questions for the current game

ALTER TABLE room_questions 
ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES room_games(id) ON DELETE CASCADE;

-- Create index for faster lookups by game_id
CREATE INDEX IF NOT EXISTS idx_room_questions_game_id ON room_questions(game_id);