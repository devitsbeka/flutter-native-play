-- Create table to track which quiz posts a user has played
CREATE TABLE public.quiz_post_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.user_quiz_posts(id) ON DELETE CASCADE,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  score INTEGER DEFAULT 0,
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.quiz_post_plays ENABLE ROW LEVEL SECURITY;

-- Users can view their own plays
CREATE POLICY "Users can view their own plays"
ON public.quiz_post_plays
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own plays
CREATE POLICY "Users can insert their own plays"
ON public.quiz_post_plays
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own plays
CREATE POLICY "Users can update their own plays"
ON public.quiz_post_plays
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_quiz_post_plays_user_id ON public.quiz_post_plays(user_id);
CREATE INDEX idx_quiz_post_plays_post_id ON public.quiz_post_plays(post_id);