-- Create user_level_progress table for tracking individual level completions
CREATE TABLE public.user_level_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id TEXT NOT NULL,
  level_number INTEGER NOT NULL,
  stars_earned INTEGER NOT NULL DEFAULT 0 CHECK (stars_earned >= 0 AND stars_earned <= 3),
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 5,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, level_number)
);

-- Enable Row Level Security
ALTER TABLE public.user_level_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own level progress"
ON public.user_level_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level progress"
ON public.user_level_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level progress"
ON public.user_level_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_level_progress_updated_at
BEFORE UPDATE ON public.user_level_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_level_progress;