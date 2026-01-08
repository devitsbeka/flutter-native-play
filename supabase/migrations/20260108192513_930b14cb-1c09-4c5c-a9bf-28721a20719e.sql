-- Create trigger for likes count
CREATE TRIGGER update_quiz_likes_count_trigger
AFTER INSERT OR DELETE ON public.quiz_post_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_quiz_likes_count();

-- Create trigger for saves count
CREATE TRIGGER update_quiz_saves_count_trigger
AFTER INSERT OR DELETE ON public.quiz_post_saves
FOR EACH ROW
EXECUTE FUNCTION public.update_quiz_saves_count();

-- Fix existing data: recalculate likes_count for all posts
UPDATE public.user_quiz_posts
SET likes_count = (
  SELECT COUNT(*) FROM public.quiz_post_likes WHERE post_id = user_quiz_posts.id
);

-- Fix existing data: recalculate saves_count for all posts
UPDATE public.user_quiz_posts
SET saves_count = (
  SELECT COUNT(*) FROM public.quiz_post_saves WHERE post_id = user_quiz_posts.id
);