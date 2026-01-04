-- Add columns for TV-initiated pairing flow
ALTER TABLE tv_sessions ADD COLUMN IF NOT EXISTS tv_pairing_code VARCHAR(4);
ALTER TABLE tv_sessions ADD COLUMN IF NOT EXISTS is_paired BOOLEAN DEFAULT FALSE;

-- Create index for quick lookup by TV pairing code
CREATE INDEX IF NOT EXISTS idx_tv_sessions_tv_pairing_code ON tv_sessions(tv_pairing_code) WHERE tv_pairing_code IS NOT NULL;