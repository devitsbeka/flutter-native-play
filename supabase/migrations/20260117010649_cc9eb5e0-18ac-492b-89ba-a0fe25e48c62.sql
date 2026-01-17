-- Create generation_jobs table to track batch generation jobs
CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  target_count INTEGER NOT NULL,
  generated_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  categories JSONB NOT NULL, -- [{id, name, quantity}]
  current_category_index INTEGER DEFAULT 0,
  current_category_progress INTEGER DEFAULT 0,
  difficulty_distribution JSONB DEFAULT '{"easy": 33, "medium": 34, "hard": 33}'::jsonb,
  batch_size INTEGER DEFAULT 10,
  interval_minutes INTEGER DEFAULT 7,
  auto_approve BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'ka',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  error_log TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create generation_job_questions table to store generated questions before approval
CREATE TABLE public.generation_job_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  incorrect_answers JSONB NOT NULL,
  difficulty TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  category_name TEXT,
  icon_slug TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'imported')),
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of TEXT,
  validation_warnings TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_job_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for generation_jobs (admin only - we'll check in app)
CREATE POLICY "Allow all for authenticated users" ON public.generation_jobs
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON public.generation_job_questions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX idx_generation_jobs_next_run ON public.generation_jobs(next_run_at) WHERE status = 'running';
CREATE INDEX idx_job_questions_job_id ON public.generation_job_questions(job_id);
CREATE INDEX idx_job_questions_status ON public.generation_job_questions(status);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_job_questions;

-- Create updated_at trigger
CREATE TRIGGER update_generation_jobs_updated_at
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();