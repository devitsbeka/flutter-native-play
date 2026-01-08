-- Add saves_count column to user_quiz_posts
ALTER TABLE public.user_quiz_posts ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0;

-- Add saves_count column to quiz_collections
ALTER TABLE public.quiz_collections ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0;

-- Drop existing trigger if exists (to recreate with correct logic)
DROP TRIGGER IF EXISTS update_likes_count_trigger ON public.quiz_post_likes;
DROP TRIGGER IF EXISTS trigger_update_saves_count ON public.quiz_post_saves;

-- Create trigger function for saves_count
CREATE OR REPLACE FUNCTION public.update_quiz_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_quiz_posts
    SET saves_count = saves_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_quiz_posts
    SET saves_count = GREATEST(0, saves_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for saves
CREATE TRIGGER trigger_update_saves_count
AFTER INSERT OR DELETE ON public.quiz_post_saves
FOR EACH ROW EXECUTE FUNCTION public.update_quiz_saves_count();

-- Sync existing likes_count from quiz_post_likes
UPDATE public.user_quiz_posts p
SET likes_count = (
  SELECT COUNT(*) FROM public.quiz_post_likes l WHERE l.post_id = p.id
);

-- Sync existing saves_count from quiz_post_saves
UPDATE public.user_quiz_posts p
SET saves_count = (
  SELECT COUNT(*) FROM public.quiz_post_saves s WHERE s.post_id = p.id
);