-- Extend session expiry default from 30 minutes to 24 hours to match code
ALTER TABLE tv_sessions 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');