-- The six "Guess the ..." media categories shipped with no icon at all —
-- icon_slug and image_url both NULL — so every surface that draws a
-- category by its icon (the quick-game blob, room pickers, lists) rendered
-- them as an empty square. Each gets an icon that exists in icon_library
-- and says what the category is about. The client also grew a
-- question-mark fallback for any future iconless category, but these six
-- deserve better than a question mark.

UPDATE public.categories SET icon_slug = 'star'               WHERE category_id = 'guess_celebrity' AND icon_slug IS NULL;
UPDATE public.categories SET icon_slug = 'movie-clapperboard' WHERE category_id = 'guess_movie'     AND icon_slug IS NULL;
UPDATE public.categories SET icon_slug = 'city'               WHERE category_id = 'guess_city'      AND icon_slug IS NULL;
UPDATE public.categories SET icon_slug = 'runner'             WHERE category_id = 'guess_sportsman' AND icon_slug IS NULL;
UPDATE public.categories SET icon_slug = 'search-magnifier'   WHERE category_id = 'guess_logo'      AND icon_slug IS NULL;
UPDATE public.categories SET icon_slug = 'globe'              WHERE category_id = 'guess_flag'      AND icon_slug IS NULL;
