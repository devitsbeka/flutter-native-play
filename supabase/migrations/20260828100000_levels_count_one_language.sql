-- A level a player can actually play.
--
-- total_levels counted every active question row in a category, and each
-- question exists SEVEN times — once per app language. So guess_logo, with
-- 70 distinct logos, advertised 490 / 10 = 49 levels. A player only ever
-- sees the 70 rows in their own language, which is seven levels of content,
-- and levels 8 through 49 could only be filled by showing the same logos
-- again. That is the repetition players reported, and it was arithmetic
-- rather than a selection bug: the level count promised content that did
-- not exist in any one language.
--
-- Counting per language and taking the smallest fixes it for every category
-- at once, whatever mix of languages it has, and can never over-promise:
-- if the thinnest language has 70 questions, seven levels is what every
-- player is offered. A category whose rows are all one language is
-- unaffected — the minimum over one group is that group.
--
--
-- Capped at 20 because that is where question selection stops: getCategoryQuestions
-- clamps its window with LEAST(20, level + 5) and its fallback queries
-- level_number BETWEEN 1 AND 20, so a level numbered 21 or higher can never be
-- served its own questions -- it falls through to the "clear everything and
-- retry" path, which is the repeat. A level the game cannot fill is not a level.
--
-- Only the count changes. Progress rows key on level_number and are
-- untouched; a category that shrinks simply stops offering levels beyond
-- what it can fill, and grows again as questions are added.

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
  SELECT LEAST(20, GREATEST(1, FLOOR(MIN(per_language)::decimal / 10)::integer))
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

-- Recount every category now, so the fix applies to what is already there
-- rather than waiting for the next question to be touched.
UPDATE public.categories c
SET total_levels = COALESCE((
  SELECT LEAST(20, GREATEST(1, FLOOR(MIN(per_language)::decimal / 10)::integer))
  FROM (
    SELECT COUNT(*) AS per_language
    FROM public.questions q
    WHERE q.category_id = c.id
      AND q.is_active = true
      AND q.in_production = true
    GROUP BY q.language
  ) counts
), 1);
