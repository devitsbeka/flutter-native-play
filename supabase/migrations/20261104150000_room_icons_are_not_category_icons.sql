-- A room never wears a category's icon.
--
-- A room's face and a category's face are read the same way on the same
-- card — the room's icon beside its name, the round's icon beside the
-- round — so a room wearing a category's icon says it IS that category.
-- "დეტექტივები" wore the mystery box, which every undecided round wears;
-- "კოსმიური კლანი" wore the astronaut, which is Astronomy's. Owner: "we
-- shouldn't use icons on rooms if we use that icon in our category
-- library, check".
--
-- The client keeps this rule in src/utils/categoryIcons.ts (the dealt
-- pool, the name generator's pick, the host's own pick) and the
-- generate-room-name function keeps it too. This is the same rule where
-- every one of those writes lands, for whatever writes the column next: a
-- room_icon a category wears becomes NULL, and a room with no icon of its
-- own is dealt one from the pool, which never holds a category's.
--
-- Every library icon is …/icon-library/<slug>.<ext>, sometimes with a
-- cache-buster after it; the slug is what a category names.

CREATE OR REPLACE FUNCTION public.room_icon_slug(p_icon text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (regexp_match(p_icon, '/icon-library/([^/?#]+?)\.[A-Za-z0-9]+(?:[?#]|$)'))[1];
$$;

CREATE OR REPLACE FUNCTION public.is_category_icon(p_icon text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_icon IS NOT NULL AND (
    public.room_icon_slug(p_icon) = 'mystery-box'
    OR EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.icon_slug = public.room_icon_slug(p_icon)
         OR c.icon = public.room_icon_slug(p_icon)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.strip_category_room_icon()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_category_icon(NEW.room_icon) THEN
    NEW.room_icon := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_icon_is_not_a_category_icon ON public.game_rooms;
CREATE TRIGGER room_icon_is_not_a_category_icon
  BEFORE INSERT OR UPDATE OF room_icon ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_category_room_icon();

-- Helpers, not entry points: nothing a client needs to call.
REVOKE ALL ON FUNCTION public.room_icon_slug(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_category_icon(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.strip_category_room_icon() FROM PUBLIC, anon;

-- The rooms already wearing one: undressed, and dealt a face by the pool.
UPDATE public.game_rooms
SET room_icon = NULL
WHERE room_icon IS NOT NULL
  AND public.is_category_icon(room_icon);
