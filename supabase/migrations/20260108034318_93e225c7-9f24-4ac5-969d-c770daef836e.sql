-- Create table for tracking cover image generations
CREATE TABLE public.cover_image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  round_id UUID REFERENCES public.user_quiz_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  image_url TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cover_image_generations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own generations"
  ON public.cover_image_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON public.cover_image_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
  ON public.cover_image_generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
  ON public.cover_image_generations FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_cover_generations_user_round ON public.cover_image_generations(user_id, round_id);