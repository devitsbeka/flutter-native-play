-- Make host_user_id nullable for TV-initiated sessions (TV creates session before host connects)
ALTER TABLE tv_sessions ALTER COLUMN host_user_id DROP NOT NULL;

-- Make pairing_code nullable (TV uses tv_pairing_code instead initially)
ALTER TABLE tv_sessions ALTER COLUMN pairing_code DROP NOT NULL;