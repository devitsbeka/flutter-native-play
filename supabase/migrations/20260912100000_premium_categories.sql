-- The premium set is nine categories, and it is not the guess ones.
--
-- 20260910100000_free_and_premium_categories.sql added `is_premium` and then
-- marked the six picture-guess categories as the premium set. That is exactly
-- backwards. The guess categories are the front door — the Popular row, the
-- bespoke 3D art, the thing a new player meets first — and putting them
-- behind a subscription paywalls the demo.
--
-- The tiers, as they are now meant to read:
--
--   free      guess_celebrity, guess_city, guess_flag, guess_logo,
--             guess_sportsman. Every level, no subscription, ever.
--   premium   the nine below. Locked outright without PRO.
--   standard  everything else. One level, then PRO.
--
-- The client carries the same nine in src/utils/categoryAccess.ts, because
-- migrations here reach the database through Lovable rather than through a
-- deploy and a client that could only learn this from the column would ship
-- the feature switched off. src/__tests__/categoryAccess.test.ts reads THIS
-- FILE and fails if the two lists stop agreeing — so change both, or neither.

-- Idempotent, and safe to run before or after the migration that adds the
-- column: if 20260910100000 has not been applied yet, this creates the
-- column itself rather than failing on a missing one.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Clear the whole board first, so this file states the complete set rather
-- than adding to whatever a previous run left behind. Without it the six
-- guess categories keep the flag the earlier migration gave them and the
-- premium tab shows fifteen.
UPDATE public.categories
SET is_premium = false
WHERE is_premium IS DISTINCT FROM false;

UPDATE public.categories
SET is_premium = true
WHERE category_id IN (
  'art',
  'celebrities',
  'fun_facts',
  'movies',
  'politics',
  'programming',
  'science',
  'space',
  'video_games'
);

COMMENT ON COLUMN public.categories.is_premium IS
  'Locked without PRO: the category is shown with a lock and its levels cannot be opened. The free tier (the guess_* categories) is decided client-side and is never premium; everything else is standard — one free level, then PRO.';

-- No policy change. `categories` is read-only to clients, so the column
-- rides the existing SELECT policy and setting it stays a SQL action.
