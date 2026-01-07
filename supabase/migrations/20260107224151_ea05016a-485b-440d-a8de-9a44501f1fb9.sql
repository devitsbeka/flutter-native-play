CREATE TABLE public.quiz_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.user_quiz_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_post_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read comments on public posts
CREATE POLICY "Anyone can read comments on public posts"
  ON public.quiz_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_quiz_posts 
      WHERE id = post_id AND is_public = true
    )
  );

-- Users can read their own comments
CREATE POLICY "Users can read own comments"
  ON public.quiz_post_comments FOR SELECT
  USING (auth.uid() = user_id);

-- Post owners can read all comments on their posts
CREATE POLICY "Post owners can read comments on their posts"
  ON public.quiz_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_quiz_posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON public.quiz_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.quiz_post_comments FOR DELETE
  USING (auth.uid() = user_id);