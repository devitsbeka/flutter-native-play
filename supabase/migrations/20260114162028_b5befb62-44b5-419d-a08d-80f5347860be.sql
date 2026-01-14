-- Create trivia_drafts table for saving single trivia drafts
CREATE TABLE public.trivia_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trivia_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own drafts
CREATE POLICY "Users can view own trivia drafts" ON public.trivia_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own trivia drafts" ON public.trivia_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trivia drafts" ON public.trivia_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trivia drafts" ON public.trivia_drafts FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_trivia_drafts_updated_at
BEFORE UPDATE ON public.trivia_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();