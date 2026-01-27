-- Add is_blind column to track trivia creation mode
-- is_blind = true means creator never saw answers (play mode)
-- is_blind = false means creator saw/edited answers (edit mode)
ALTER TABLE user_quiz_posts 
ADD COLUMN is_blind BOOLEAN NOT NULL DEFAULT false;