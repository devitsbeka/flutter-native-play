-- User Quiz Posts table
CREATE TABLE public.user_quiz_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  cover_gradient TEXT NOT NULL,
  icon_slug TEXT,
  question_count INTEGER NOT NULL,
  answer_format TEXT NOT NULL CHECK (answer_format IN ('4_answers', 'true_false')),
  questions JSONB NOT NULL DEFAULT '[]',
  likes_count INTEGER DEFAULT 0,
  plays_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz post likes tracking
CREATE TABLE public.quiz_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.user_quiz_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Quiz post saves tracking
CREATE TABLE public.quiz_post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.user_quiz_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.user_quiz_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_post_saves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_quiz_posts
CREATE POLICY "Anyone can view quiz posts" 
ON public.user_quiz_posts 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own quiz posts" 
ON public.user_quiz_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz posts" 
ON public.user_quiz_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quiz posts" 
ON public.user_quiz_posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for quiz_post_likes
CREATE POLICY "Anyone can view likes" 
ON public.quiz_post_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can like posts" 
ON public.quiz_post_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" 
ON public.quiz_post_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for quiz_post_saves
CREATE POLICY "Users can view their saves" 
ON public.quiz_post_saves 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts" 
ON public.quiz_post_saves 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" 
ON public.quiz_post_saves 
FOR DELETE 
USING (auth.uid() = user_id);

-- Function to increment plays count
CREATE OR REPLACE FUNCTION public.increment_quiz_plays(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_quiz_posts
  SET plays_count = plays_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update likes count
CREATE OR REPLACE FUNCTION public.update_quiz_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_quiz_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_quiz_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for likes count
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON public.quiz_post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_quiz_likes_count();

-- Updated at trigger
CREATE TRIGGER update_quiz_posts_updated_at
BEFORE UPDATE ON public.user_quiz_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();