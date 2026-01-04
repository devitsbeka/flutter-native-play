-- Add columns for tracking question shortening status
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS shorten_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS original_question_text TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN questions.shorten_status IS 'Values: shortened, unshortenable, failed, or NULL (not processed)';
COMMENT ON COLUMN questions.original_question_text IS 'Stores original text before AI shortening for potential rollback';