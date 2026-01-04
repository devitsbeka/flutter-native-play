-- Add production status column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS in_production BOOLEAN DEFAULT false;

-- Mark all valid questions (<=67 chars and active) as in production
UPDATE questions 
SET in_production = true 
WHERE LENGTH(question_text) <= 67 
  AND is_active = true;

-- Ensure long questions are NOT in production
UPDATE questions 
SET in_production = false 
WHERE LENGTH(question_text) > 67;