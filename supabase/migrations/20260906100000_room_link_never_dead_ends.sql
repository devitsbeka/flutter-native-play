-- A room link should tell you what it was, even after the room is over.
--
-- room_preview and room_players both ended with
--
--   AND r.is_archived IS NOT TRUE
--
-- so once a room was archived the link resolved to nothing and the invite
-- screen drew "this invitation link no longer works" — the same screen a
-- mistyped code gets. A link that was real when it was sent should not be
-- indistinguishable from one that never existed. What it was, who was in it
-- and when it was made are all still on the row; only the ability to join is
-- gone.
--
-- So the filter comes off and the FACTS come back instead. Whether the link
-- can still be walked through is the client's decision, from is_archived and
-- room_status, and it can now say "this game is finished, here is what it
-- was" and still offer the host as a friend.
--
-- created_at and last_activity_at are added for the same reason: "3 days
-- ago" is the difference between a link someone forgot to open and one they
-- are opening a week later.
--
-- Return types change, so these are dropped rather than replaced —
-- CREATE OR REPLACE cannot change a function's OUT columns.

DROP FUNCTION IF EXISTS public.room_preview(text);
DROP FUNCTION IF EXISTS public.room_players(text);

CREATE FUNCTION public.room_preview(p_room_code text)
RETURNS TABLE (
  host_user_id uuid,
  host_nickname text,
  host_avatar_url text,
  host_animated_avatar_url text,
  host_country_code text,
  room_code text,
  room_name text,
  category_id text,
  category_name text,
  room_status text,
  player_count integer,
  is_archived boolean,
  created_at timestamptz,
  last_activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.host_user_id,
    p.nickname,
    p.avatar_url,
    p.animated_avatar_url,
    p.country_code,
    r.room_code,
    r.room_name,
    r.category_id,
    r.category_name,
    r.status::text,
    (SELECT count(*)::integer FROM room_participants rp WHERE rp.room_id = r.id),
    COALESCE(r.is_archived, false),
    r.created_at,
    r.last_activity_at
  FROM game_rooms r
  JOIN profiles p ON p.user_id = r.host_user_id
  WHERE upper(r.room_code) = upper(p_room_code)
  -- Newest first: room codes are short and get reused over time, and the one
  -- somebody is holding a link to is the one that was made most recently.
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.room_preview(text) FROM public;
GRANT EXECUTE ON FUNCTION public.room_preview(text) TO anon, authenticated;


CREATE FUNCTION public.room_players(p_room_code text)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  avatar_url text,
  animated_avatar_url text,
  country_code text,
  is_host boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rp.user_id,
    COALESCE(p.nickname, rp.nickname),
    COALESCE(p.avatar_url, rp.avatar_url),
    p.animated_avatar_url,
    p.country_code,
    rp.user_id = r.host_user_id
  FROM game_rooms r
  JOIN room_participants rp ON rp.room_id = r.id
  LEFT JOIN profiles p ON p.user_id = rp.user_id
  WHERE upper(r.room_code) = upper(p_room_code)
    AND r.id = (
      SELECT r2.id FROM game_rooms r2
      WHERE upper(r2.room_code) = upper(p_room_code)
      ORDER BY r2.created_at DESC
      LIMIT 1
    )
  ORDER BY (rp.user_id = r.host_user_id) DESC, rp.joined_at;
$$;

REVOKE ALL ON FUNCTION public.room_players(text) FROM public;
GRANT EXECUTE ON FUNCTION public.room_players(text) TO anon, authenticated;
