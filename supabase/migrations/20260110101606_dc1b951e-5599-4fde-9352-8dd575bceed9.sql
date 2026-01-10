-- Add columns for answer shortening tracking
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS answer_shorten_status TEXT,
ADD COLUMN IF NOT EXISTS original_correct_answer TEXT,
ADD COLUMN IF NOT EXISTS original_incorrect_answers JSONB;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_questions_answer_shorten_status ON questions(answer_shorten_status);

COMMENT ON COLUMN questions.answer_shorten_status IS 'Status of answer shortening: shortened, unshortenable, partially_shortened, failed, null';
COMMENT ON COLUMN questions.original_correct_answer IS 'Original correct answer before AI shortening';
COMMENT ON COLUMN questions.original_incorrect_answers IS 'Original incorrect answers array before AI shortening';