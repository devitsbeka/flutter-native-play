-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_update_saves_count ON quiz_post_saves;
DROP TRIGGER IF EXISTS trigger_update_likes_count ON quiz_post_likes;
DROP TRIGGER IF EXISTS update_quiz_saves_count ON quiz_post_saves;
DROP TRIGGER IF EXISTS update_quiz_likes_count ON quiz_post_likes;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_quiz_post_saves_count();
DROP FUNCTION IF EXISTS update_quiz_post_likes_count();

-- Create function to update saves count atomically
CREATE OR REPLACE FUNCTION update_quiz_post_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_quiz_posts 
    SET saves_count = COALESCE(saves_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_quiz_posts 
    SET saves_count = GREATEST(0, COALESCE(saves_count, 0) - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update likes count atomically
CREATE OR REPLACE FUNCTION update_quiz_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_quiz_posts 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_quiz_posts 
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic count updates
CREATE TRIGGER trigger_update_saves_count
AFTER INSERT OR DELETE ON quiz_post_saves
FOR EACH ROW EXECUTE FUNCTION update_quiz_post_saves_count();

CREATE TRIGGER trigger_update_likes_count
AFTER INSERT OR DELETE ON quiz_post_likes
FOR EACH ROW EXECUTE FUNCTION update_quiz_post_likes_count();

-- Sync existing saves_count with actual saves
UPDATE user_quiz_posts p
SET saves_count = COALESCE(
  (SELECT COUNT(*) FROM quiz_post_saves s WHERE s.post_id = p.id),
  0
);

-- Sync existing likes_count with actual likes
UPDATE user_quiz_posts p
SET likes_count = COALESCE(
  (SELECT COUNT(*) FROM quiz_post_likes l WHERE l.post_id = p.id),
  0
);