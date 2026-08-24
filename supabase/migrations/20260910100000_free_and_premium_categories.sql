-- Categories can be free or premium, and Explore filters on it.
--
-- The Explore design puts two filters at the head of the tab strip — უფასო
-- and პრემიუმ — and nothing in the schema could answer either one. `type`
-- (classic / fun / educational) is about subject matter, not about what a
-- subscription buys, so the two tabs had nothing to filter on.
--
-- One boolean, defaulting to false: a category is free unless somebody says
-- otherwise, so every category that exists today keeps behaving exactly as
-- it does now and anything added later has to opt in.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.categories.is_premium IS
  'Shown under Explore''s პრემიუმ filter. Marks the category as part of what a subscription is for; it does not by itself gate play.';

-- The six picture-guess categories are the first premium set — they are the
-- ones the Popular row is made of, the ones with bespoke 3D art, and the
-- ones this was asked for by name.
--
-- Matched on category_id (the stable slug), not on the UUID, so this applies
-- to whichever database it is run against. Idempotent: running it twice sets
-- the same six rows to the same value.
UPDATE public.categories
SET is_premium = true
WHERE category_id IN (
  'guess_celebrity',
  'guess_movie',
  'guess_city',
  'guess_sportsman',
  'guess_logo',
  'guess_flag'
);

-- No policy change. `categories` is read-only to clients already — the
-- column rides along on the existing SELECT policy, and marking a category
-- premium stays an admin/SQL action, which is what "we will pick some" needs
-- it to be.
