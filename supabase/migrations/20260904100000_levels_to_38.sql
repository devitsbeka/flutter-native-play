-- Levels can now go to 38.
--
-- 20260828100000 capped total_levels at 20 because that is where question
-- selection stopped: getCategoryQuestions clamped its window with
-- LEAST(20, level + 5) and its fallback asked for level_number BETWEEN 1 AND
-- 20, so a level numbered 21 could never be served its own questions -- it
-- fell through to the "clear every exclusion and take anything" path, which
-- is the repetition players reported.
--
-- The client's ceiling is now MAX_PLAYABLE_LEVEL = 38 (questionService.ts),
-- so this follows it. The two numbers have to agree in both directions:
--   * a category advertising more levels than selection can serve repeats
--   * a category advertising fewer wastes the questions above the line
--
-- Nothing else changes. The count is still the number of questions in the
-- THINNEST language divided by ten, because a level a French player cannot
-- fill is not a level just because a Georgian one can.
--
-- What each category can actually reach is a content question, not this one.
-- Celebrities and athletes have as many recognisable faces as anyone cares
-- to harvest. Flags do not: the world has about 195 countries, so that bank
-- tops out around 24 levels however hard it is pushed, and this simply lets
-- it advertise what it has instead of stopping at 17.

CREATE OR REPLACE FUNCTION public.update_category_total_levels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- The language with the fewest questions decides how many levels exist.
  SELECT LEAST(38, GREATEST(1, FLOOR(MIN(per_language)::decimal / 10)::integer))
    INTO new_total_levels
  FROM (
    SELECT COUNT(*) AS per_language
    FROM questions q
    WHERE q.category_id = affected_category_id
      AND q.is_active = true
      AND q.in_production = true
    GROUP BY q.language
  ) counts;

  -- No questions at all: GROUP BY yields no rows and MIN is NULL.
  new_total_levels := COALESCE(new_total_levels, 1);

  UPDATE categories
  SET total_levels = new_total_levels,
      levels_updated_at = CASE
        WHEN new_total_levels > COALESCE(old_total_levels, 0) THEN now()
        ELSE levels_updated_at
      END
  WHERE id = affected_category_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recount now, so a category already holding more than 200 questions per
-- language stops advertising 20 and starts offering what it has.
UPDATE public.categories c
SET total_levels = COALESCE((
  SELECT LEAST(38, GREATEST(1, FLOOR(MIN(per_language)::decimal / 10)::integer))
  FROM (
    SELECT COUNT(*) AS per_language
    FROM public.questions q
    WHERE q.category_id = c.id
      AND q.is_active = true
      AND q.in_production = true
    GROUP BY q.language
  ) counts
), 1);
