-- The nine premium categories, and only those nine.
--
-- 20260910100000_free_and_premium_categories.sql added the is_premium column
-- and, in the same breath, guessed at who should be premium: it marked the six
-- picture-guess categories, on the reasoning that they are the ones with
-- bespoke 3D art. That was never asked for. The nine that were asked for are
-- these, and the picture-guess set is free:
--
--   სახალისო ფაქტები      fun_facts
--   მეცნიერება            science
--   ხელოვნება             art
--   პოლიტიკა              politics
--   კინო                  movies
--   ვიდეო თამაშები        video_games
--   ცნობილი ადამიანები    celebrities
--   კოსმოსი               space
--   პროგრამირება          programming
--
-- Written as one UPDATE over every row rather than as "set these nine, clear
-- those six", so the table cannot be left holding a third state from whatever
-- was marked before. After this runs, exactly nine rows are premium no matter
-- what the column held going in — including on a database where the earlier
-- migration never ran at all.
--
-- Matched on category_id, the stable slug, not on the UUID or the Georgian
-- name: the names are translated per language and the uuids differ between
-- databases.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

UPDATE public.categories
SET is_premium = (category_id IN (
  'fun_facts',
  'science',
  'art',
  'politics',
  'movies',
  'video_games',
  'celebrities',
  'space',
  'programming'
))
WHERE is_premium IS DISTINCT FROM (category_id IN (
  'fun_facts',
  'science',
  'art',
  'politics',
  'movies',
  'video_games',
  'celebrities',
  'space',
  'programming'
));

-- To check: nine rows, and none of them a guess_ category.
--
--   SELECT category_id, name FROM public.categories
--    WHERE is_premium ORDER BY category_id;
