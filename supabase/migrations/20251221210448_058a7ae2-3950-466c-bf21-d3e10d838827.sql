-- Create user_country_progress table
CREATE TABLE public.user_country_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  continent_id TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT false,
  categories_completed INTEGER DEFAULT 0,
  total_categories INTEGER DEFAULT 8,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, country_code)
);

-- Create user_category_progress table
CREATE TABLE public.user_category_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  category_id TEXT NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, country_code, category_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_country_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_country_progress
CREATE POLICY "Users can view their own country progress"
ON public.user_country_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own country progress"
ON public.user_country_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own country progress"
ON public.user_country_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for user_category_progress
CREATE POLICY "Users can view their own category progress"
ON public.user_category_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category progress"
ON public.user_category_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category progress"
ON public.user_category_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_country_progress_updated_at
BEFORE UPDATE ON public.user_country_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_category_progress_updated_at
BEFORE UPDATE ON public.user_category_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();