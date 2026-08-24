-- A language-specific category is counted in its own language.
--
-- update_category_total_levels takes the THINNEST language and divides by
-- ten, so that a level a French player cannot fill is not counted as a level
-- just because a Georgian one can. That rule is right for a category every
-- language is meant to share, and wrong for a category that belongs to one
-- language by design.
--
-- საქართველოს ისტორია is Georgian. It holds 194 Georgian questions, enough
-- for nineteen levels, and it advertised ONE — because at some point two
-- German, two English, two Spanish, two French, two Italian and two
-- Portuguese questions were added to it. MIN over those seven groups is 2,
-- floor(2/10) is 0, clamped to 1. Six strays out of two hundred decided the
-- whole category. ქართული კულტურა is the same story with one stray apiece
-- and 214 Georgian questions behind it.
--
-- The other twenty-two language-specific categories — the German, Spanish,
-- French, Italian and Portuguese sets — happen to be fine only because
-- nobody has yet added a stray question in a second language to any of them.
-- They sit on 16 to 20 levels and are one misfiled row away from 1.
--
-- So the count now asks what the category is for. is_language_specific =
-- true means one language decides it: its own. Everything else is unchanged,
-- including the thinnest-language rule for the categories that really are
-- shared, and the ceiling of 38.
--
-- This does NOT invent levels. A category still advertises only what it can
-- serve; the fix is that a Georgian category is no longer judged on its
-- German.

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
  cat_language text;
  cat_is_specific boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_category_id := OLD.category_id;
  ELSE
    affected_category_id := NEW.category_id;
  END IF;

  SELECT total_levels, language, COALESCE(is_language_specific, false)
    INTO old_total_levels, cat_language, cat_is_specific
  FROM categories
  WHERE id = affected_category_id;

  -- A shared category is held to its thinnest language. A language-specific
  -- one is held to its own, and questions filed against it in any other
  -- language are ignored rather than allowed to set the ceiling.
  SELECT LEAST(38, GREATEST(1, FLOOR(MIN(per_language)::decimal / 10)::integer))
    INTO new_total_levels
  FROM (
    SELECT COUNT(*) AS per_language
    FROM questions q
    WHERE q.category_id = affected_category_id
      AND q.is_active = true
      AND q.in_production = true
      AND (NOT cat_is_specific OR q.language = cat_language)
    GROUP BY q.language
  ) counts;

  -- No questions at all: GROUP BY yields no rows and MIN is NULL. Also the
  -- case where a language-specific category holds nothing in its own
  -- language, which is a content problem, not a reason to divide by zero.
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

-- Recount every category against the corrected rule, so the two Georgian
-- categories stop advertising one level without waiting for somebody to
-- happen to edit a question in them.
--
-- Written as the same expression the trigger uses, not a second version of
-- it: the previous recount and its trigger drifted apart once already.
UPDATE public.categories c
SET total_levels = COALESCE((
  SELECT LEAST(38, GREATEST(1, FLOOR(MIN(per_language)::decimal / 10)::integer))
  FROM (
    SELECT COUNT(*) AS per_language
    FROM public.questions q
    WHERE q.category_id = c.id
      AND q.is_active = true
      AND q.in_production = true
      AND (NOT COALESCE(c.is_language_specific, false) OR q.language = c.language)
    GROUP BY q.language
  ) counts
), 1),
levels_updated_at = CASE
  WHEN COALESCE((
    SELECT LEAST(38, GREATEST(1, FLOOR(MIN(per_language)::decimal / 10)::integer))
    FROM (
      SELECT COUNT(*) AS per_language
      FROM public.questions q
      WHERE q.category_id = c.id
        AND q.is_active = true
        AND q.in_production = true
        AND (NOT COALESCE(c.is_language_specific, false) OR q.language = c.language)
      GROUP BY q.language
    ) counts
  ), 1) > COALESCE(c.total_levels, 0) THEN now()
  ELSE c.levels_updated_at
END;
