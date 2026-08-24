-- Twenty categories had no icon_slug, so they drew a random one.
--
-- DynamicIcon's last resort is getRandomIconForCategory(): given a category
-- and no slug, it picks an icon from that category's set by a hash. It is
-- there for QUESTIONS, where a different picture per question is the point.
-- For a category it is wrong, and it is wrong loudly — a banana over "guess
-- the city", a camera over "world history".
--
-- Fifty-one categories carry a slug and never reach that path. These twenty
-- did not: every localised cuisine / culture / history / literature category
-- for French, German, Italian, Portuguese and Spanish. The Georgian four have
-- always had theirs (khachapuri, grape, book-stand, literature-class), which
-- is why the problem was invisible in Georgian.
--
-- Every slug below was checked against icon_library and then LOOKED AT, as a
-- contact sheet, because a slug that reads right can be the wrong picture:
-- "rooster" is a farm bird rather than the Barcelos cockerel, so Portuguese
-- culture is a bottle of port instead.
--
-- The four literature categories share literature-class. The library has no
-- Cervantes, Dante, Goethe or Camões, and georgian_literature already uses
-- that icon — so this matches what is there rather than inventing a
-- distinction the pictures cannot carry.
--
-- Only fills what is empty. A slug set by hand later is never overwritten,
-- and running this twice changes nothing the second time.

UPDATE public.categories AS c
SET icon_slug = v.icon_slug
FROM (VALUES
  -- France
  ('french_cuisine',        'baguette'),
  ('french_culture',        'eiffel-tower'),
  ('french_history',        'napoleon-bonaparte'),
  ('french_literature',     'literature-class'),
  -- Germany
  ('german_cuisine',        'bavarian-white-sausages'),
  ('german_culture',        'neuschwanstein-castle'),
  ('german_history',        'berlin-germany'),
  ('german_literature',     'literature-class'),
  -- Italy
  ('italian_cuisine',       'pizza'),
  ('italian_culture',       'colosseum'),
  ('italian_history',       'roman-gladiator-helmet'),
  ('italian_literature',    'literature-class'),
  -- Portugal
  ('portuguese_cuisine',    'pastel-de-nata'),
  ('portuguese_culture',    'port-wine'),
  ('portuguese_history',    'caravel'),
  ('portuguese_literature', 'literature-class'),
  -- Spain
  ('spanish_cuisine',       'paella'),
  ('spanish_culture',       'la-sagrada-famlia'),
  ('spanish_history',       'alhambra'),
  ('spanish_literature',    'literature-class')
) AS v(category_id, icon_slug)
WHERE c.category_id = v.category_id
  AND c.icon_slug IS NULL;

-- Every one of these must exist in the library, or the category is back to
-- drawing a random icon and nothing says so. Fails the migration rather than
-- letting that ship.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(DISTINCT c.icon_slug, ', ')
    INTO missing
  FROM public.categories c
  WHERE c.icon_slug IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.icon_library il WHERE il.slug = c.icon_slug
    );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'These category icon_slugs are not in icon_library: %', missing;
  END IF;
END $$;
