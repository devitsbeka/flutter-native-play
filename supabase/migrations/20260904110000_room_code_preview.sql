-- The same welcome screen for a link that only knows a room code.
--
-- /i/<code> is the new invite link and it lands on a screen that says who is
-- inviting you. Every link shared before it — and every link the room
-- lobby's own share button still produced — is /room/<code>, which redirected
-- to /team?join=<code> and hit the signed-out wall: a white page reading
-- "Multiplayer — you have been invited to a room", with no idea by whom, to
-- what, or with whom. Those links are out in the world and cannot be
-- recalled, so they get the same screen.
--
-- What they do NOT get is the automatic friendship.
--
-- The personal code is sixteen unguessable characters that only its owner
-- can mint, which is what makes holding one proof that its owner asked. A
-- room code is six characters, printed in the lobby for anyone present, and
-- pasted into group chats. Joining a room with it is exactly what it is for;
-- being added to the host's friends list is not something it should be able
-- to do on its own. So on this path the host is offered with a friend button
-- like everyone else in the room, and the player decides.

CREATE OR REPLACE FUNCTION public.room_preview(p_room_code text)
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
  player_count integer
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
    (SELECT count(*)::integer FROM room_participants rp WHERE rp.room_id = r.id)
  FROM game_rooms r
  JOIN profiles p ON p.user_id = r.host_user_id
  WHERE upper(r.room_code) = upper(p_room_code)
    AND r.is_archived IS NOT TRUE
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.room_preview(text) FROM public;
GRANT EXECUTE ON FUNCTION public.room_preview(text) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.room_players(p_room_code text)
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
    AND r.is_archived IS NOT TRUE
  ORDER BY (rp.user_id = r.host_user_id) DESC, rp.joined_at;
$$;

REVOKE ALL ON FUNCTION public.room_players(text) FROM public;
GRANT EXECUTE ON FUNCTION public.room_players(text) TO anon, authenticated;
