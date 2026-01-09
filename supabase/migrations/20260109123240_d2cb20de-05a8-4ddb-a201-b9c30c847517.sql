-- Add 'invited' to participant_status enum
ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'invited' BEFORE 'joined';