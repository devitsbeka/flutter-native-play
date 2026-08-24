-- Pack the picture categories ten questions to a level, with no gaps.
--
-- Run this LAST, after 20260904100000 (which raises the ceiling to 38) and
-- after the four expansion migrations dated 20260905. It is idempotent:
-- running it twice produces the same numbering.
--
-- Why it is needed
-- ----------------
-- The bank was numbered under the old ceiling of 20, so 300 celebrities
-- were spread fifteen to a level across levels 1-20. Raising the ceiling
-- does not renumber anything, and the expansion migrations append their new
-- subjects above what the old numbering reached. The result is a category
-- that advertises 38 levels with questions at 1-20 and 31-38, and nothing
-- at all between.
--
-- That gap is survivable but wrong. getCategoryQuestions asks for
-- level_number BETWEEN level-3 AND level+5 first; on level 25 that window
-- is empty, so every request there falls to the second query, which takes
-- any level from 1 to 38. The player still gets unseen questions -- the
-- repetition bug needed the THIRD fallback, which clears the exclusion list
-- -- but the difficulty curve stops meaning anything, because a level in
-- the hole is served from the whole bank at random.
--
-- What it does
-- ------------
-- Renumbers every active question in the six picture categories so level 1
-- holds the first ten, level 2 the next ten, and so on, stopping at
-- whatever total_levels the category actually has.
--
-- The order is (old level, image_url). Old level first, so the existing
-- difficulty ordering survives -- the best-known subjects were at level 1
-- and stay near it, and the newly appended ones stay at the end where their
-- expansion put them. Then image_url, because it is the ONE field that is
-- identical across the seven languages: ordering by the answer text instead
-- would rank Georgian and Portuguese differently and put the same subject
-- on different levels depending on who is playing.
--
-- The trigger on questions fires on is_active, in_production and
-- category_id only, so renumbering does not recompute total_levels. The
-- expansion migrations' INSERTs already did that.

BEGIN;

WITH cats AS (
  SELECT id
  FROM public.categories
  WHERE category_id IN (
    'guess_flag', 'guess_logo', 'guess_celebrity',
    'guess_sportsman', 'guess_city', 'guess_movie'
  )
),
-- The thinnest language decides, exactly as update_category_total_levels
-- does. A level the French bank cannot fill is not a level.
caps AS (
  SELECT per_lang.category_id,
         LEAST(38, GREATEST(1, FLOOR(MIN(per_lang.n)::decimal / 10)::integer)) AS cap
  FROM (
    SELECT q.category_id, q.language, COUNT(*) AS n
    FROM public.questions q
    JOIN cats c ON c.id = q.category_id
    WHERE q.is_active = true AND q.in_production = true
    GROUP BY q.category_id, q.language
  ) per_lang
  GROUP BY per_lang.category_id
),
ranked AS (
  SELECT q.id,
         q.category_id,
         row_number() OVER (
           PARTITION BY q.category_id, q.language
           ORDER BY q.level_number, q.image_url, q.id
         ) AS rn,
         count(*) OVER (PARTITION BY q.category_id, q.language) AS n_lang
  FROM public.questions q
  JOIN cats c ON c.id = q.category_id
  WHERE q.is_active = true AND q.in_production = true
)
-- Spread across the levels that exist, rather than filling ten at a time and
-- clamping. The two are the same arithmetic while the languages are level
-- with each other, which today they are -- every one of these categories
-- holds the same count in all seven. They stop being the same the moment one
-- language runs ahead: with 216 flags in English and 95 in Portuguese the cap
-- is 9, and filling ten at a time puts 10 questions on each of levels 1-8 and
-- 136 on level 9. Dividing the rank by the number of levels puts 24 on each.
UPDATE public.questions q
SET level_number = LEAST(
      caps.cap,
      (((ranked.rn - 1) * caps.cap) / ranked.n_lang) + 1
    )::integer
FROM ranked
JOIN caps ON caps.category_id = ranked.category_id
WHERE q.id = ranked.id
  AND q.level_number IS DISTINCT FROM LEAST(
      caps.cap,
      (((ranked.rn - 1) * caps.cap) / ranked.n_lang) + 1
    )::integer;

COMMIT;
