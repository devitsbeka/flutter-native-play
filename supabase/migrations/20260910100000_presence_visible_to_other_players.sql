-- A player can see whether the people they are playing with are online.
--
-- Right now they cannot, and the rule is one line:
--
--   CREATE POLICY "Users and admins can view presence"
--   ON public.user_presence FOR SELECT TO authenticated
--   USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
--
-- A signed-in player can read exactly ONE row of user_presence: their own.
-- Every screen that asks "who is here" — the lobby's green ring, the room
-- card's live badge, the friends reel's dot — is reading that table directly,
-- so all of them answer the same way: you are online, and nobody else in the
-- world ever is. The lobby has been drawing every other player in grey since
-- the policy was written, which is exactly what it is supposed to mean when
-- somebody has closed the app, and it never once meant that.
--
-- Opening the policy up is the wrong fix: the row also carries current_page,
-- which is a log of where each player is in the app minute by minute, and
-- country_code. Neither belongs to anyone but its owner and an admin.
--
-- So the presence anyone may ask about is a function, and it answers with
-- three facts rather than with rows:
--
--   is_online        status online and a heartbeat inside two minutes, the
--                    same rule every screen already applies client-side
--   recently_active  a heartbeat inside ten minutes, which is what the rooms
--                    list uses to say a room has been touched today
--   current_room     the room they are IN, and only that — a page path is
--                    returned only when it is a room, so "in the shop" or
--                    "reading the privacy policy" stays private
--
-- The table's own policies are untouched: the row, with its page and its
-- country, is still readable only by its owner and by an admin.

-- user_id is uuid; the ids arrive from the client as strings, and one of them
-- can be a guest key that is not a uuid at all, so the comparison is made in
-- text. Casting the array to uuid[] instead would throw on the whole call the
-- first time a guest is in the room.
DROP FUNCTION IF EXISTS public.presence_for_users(text[]);

CREATE FUNCTION public.presence_for_users(p_user_ids text[])
RETURNS TABLE (
  user_id text,
  is_online boolean,
  recently_active boolean,
  current_room text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id::text,
    (p.status = 'online' AND p.last_seen >= now() - interval '2 minutes') AS is_online,
    (p.last_seen >= now() - interval '10 minutes') AS recently_active,
    -- Only ever a room. Everything else about where they are is dropped here
    -- rather than sent and ignored.
    CASE
      WHEN p.current_page LIKE '/room/%' THEN substring(p.current_page from 8)
      ELSE NULL
    END AS current_room
  FROM public.user_presence p
  WHERE p.user_id::text = ANY(p_user_ids)
$$;

-- SECURITY DEFINER functions are granted to PUBLIC by default, which would
-- hand this to anyone holding the anon key. Revoke, then grant explicitly.
REVOKE ALL ON FUNCTION public.presence_for_users(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.presence_for_users(text[]) TO authenticated, anon;

COMMENT ON FUNCTION public.presence_for_users(text[]) IS
  'Online/recent/in-a-room for the given users. The only way a player learns '
  'about anyone else''s presence: user_presence itself stays owner-only, so '
  'current_page and country_code never leave the row.';
