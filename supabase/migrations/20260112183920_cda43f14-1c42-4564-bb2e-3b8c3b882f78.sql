-- Add icon_slug column to room_questions for custom trivia icons
ALTER TABLE room_questions ADD COLUMN IF NOT EXISTS icon_slug TEXT;