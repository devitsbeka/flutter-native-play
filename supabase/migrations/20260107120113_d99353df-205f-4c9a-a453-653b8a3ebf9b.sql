-- Add quality tracking columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quality_issues JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_quality_check TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for quality status filtering
CREATE INDEX IF NOT EXISTS idx_questions_quality_status ON public.questions(quality_status);

-- Comment on new columns
COMMENT ON COLUMN public.questions.quality_status IS 'Quality check status: good, needs_review, needs_rewrite, or null';
COMMENT ON COLUMN public.questions.quality_issues IS 'Array of quality issue types found in the question';
COMMENT ON COLUMN public.questions.last_quality_check IS 'Timestamp of last quality check';