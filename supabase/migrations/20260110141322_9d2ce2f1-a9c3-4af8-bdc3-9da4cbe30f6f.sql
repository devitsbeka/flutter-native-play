-- Set default for last_activity_at to current timestamp so new rooms appear first
ALTER TABLE game_rooms 
  ALTER COLUMN last_activity_at SET DEFAULT now();

-- Add room_icon column for storing the random icon used to generate the name
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS room_icon TEXT;