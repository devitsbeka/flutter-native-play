-- Step 1: Update the trigger function to count only PRODUCTION questions
CREATE OR REPLACE FUNCTION public.update_category_total_levels()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  affected_category_id uuid;
  old_total_levels integer;
  new_total_levels integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_category_id := OLD.category_id;
  ELSE
    affected_category_id := NEW.category_id;
  END IF;
  
  SELECT total_levels INTO old_total_levels FROM categories WHERE id = affected_category_id;
  
  -- Count only PRODUCTION questions (in_production = true)
  SELECT GREATEST(1, FLOOR(COUNT(*)::decimal / 10)::integer) INTO new_total_levels
  FROM questions q
  WHERE q.category_id = affected_category_id 
    AND q.is_active = true 
    AND q.in_production = true;
  
  UPDATE categories
  SET total_levels = new_total_levels,
      levels_updated_at = CASE 
        WHEN new_total_levels > COALESCE(old_total_levels, 0) THEN now()
        ELSE levels_updated_at
      END
  WHERE id = affected_category_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Step 2: Recreate trigger to also fire when in_production changes
DROP TRIGGER IF EXISTS trigger_update_category_levels ON questions;
CREATE TRIGGER trigger_update_category_levels
AFTER INSERT OR UPDATE OF is_active, in_production, category_id OR DELETE 
ON questions
FOR EACH ROW
EXECUTE FUNCTION update_category_total_levels();

-- Step 3: Recalculate ALL existing categories based on production questions only
UPDATE categories c
SET total_levels = (
  SELECT GREATEST(1, FLOOR(COUNT(*)::decimal / 10)::integer)
  FROM questions q
  WHERE q.category_id = c.id 
    AND q.is_active = true 
    AND q.in_production = true
);