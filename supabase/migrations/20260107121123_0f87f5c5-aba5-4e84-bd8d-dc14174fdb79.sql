-- Update all categories to have total_levels matching actual question counts (10 questions per level)
UPDATE categories c
SET total_levels = (
  SELECT GREATEST(1, FLOOR(COUNT(*)::decimal / 10)::integer)
  FROM questions q
  WHERE q.category_id = c.id AND q.is_active = true
);

-- Create a trigger to auto-update total_levels when questions change
CREATE OR REPLACE FUNCTION update_category_total_levels()
RETURNS TRIGGER AS $$
DECLARE
  affected_category_id uuid;
BEGIN
  -- Get the category_id from either OLD or NEW depending on operation
  IF TG_OP = 'DELETE' THEN
    affected_category_id := OLD.category_id;
  ELSE
    affected_category_id := NEW.category_id;
  END IF;
  
  -- Update the category's total_levels
  UPDATE categories
  SET total_levels = (
    SELECT GREATEST(1, FLOOR(COUNT(*)::decimal / 10)::integer)
    FROM questions q
    WHERE q.category_id = affected_category_id AND q.is_active = true
  )
  WHERE id = affected_category_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on questions table
DROP TRIGGER IF EXISTS trigger_update_category_levels ON questions;
CREATE TRIGGER trigger_update_category_levels
AFTER INSERT OR UPDATE OR DELETE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_category_total_levels();