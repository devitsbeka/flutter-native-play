-- Add quality review columns to questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS ai_review_score integer;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS ai_review_grade text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS ai_review_data jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS last_ai_review timestamp with time zone;

-- Add index for filtering by grade
CREATE INDEX IF NOT EXISTS idx_questions_ai_review_grade ON public.questions(ai_review_grade) WHERE ai_review_grade IS NOT NULL;