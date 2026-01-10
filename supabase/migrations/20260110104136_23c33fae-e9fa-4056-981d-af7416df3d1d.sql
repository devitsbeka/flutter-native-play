-- Add pending columns for shortened content that needs approval
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS pending_question_text TEXT,
ADD COLUMN IF NOT EXISTS pending_correct_answer TEXT,
ADD COLUMN IF NOT EXISTS pending_incorrect_answers JSONB;