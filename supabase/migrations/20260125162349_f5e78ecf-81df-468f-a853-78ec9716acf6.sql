-- Add is_active column to tv_players to track player activity status
ALTER TABLE tv_players 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add updated_at column if it doesn't exist for tracking last activity
ALTER TABLE tv_players 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index for efficient querying of active players
CREATE INDEX IF NOT EXISTS idx_tv_players_session_active 
ON tv_players(tv_session_id, is_active) 
WHERE is_active = true;