-- A room nobody ever came to stops being listed after a week.
--
-- You can create a room without meaning to: tap a game on the chooser, back
-- out before inviting anyone or picking a category, and the room is already
-- written. Those accumulate. They are the emptiest, least joinable cards on
-- the page, they push real rooms down it, and the host has usually forgotten
-- they exist.
--
-- "Untouched" is deliberately narrow: nobody but the host ever sat in it AND
-- nothing has happened in it for a week. A room that had guests is somebody's
-- game, however quiet it has gone since, and is left alone — this is about
-- the ones that were never used at all, not about tidying old games.
--
-- Two halves, because there is no scheduler on this database:
--
--   1. A sweep, here, for the ones already sitting in the table.
--   2. A read-time filter in `public_rooms`, so the rule keeps holding on its
--      own from now on. Without it the sweep would fix today and the list
--      would fill up again by next week.
--
-- Archived rather than deleted. `is_archived` is what every other "this room
-- is over" path already sets, both listings already respect it, and it leaves
-- the row for anyone reading their history. Deleting would take the room's
-- rounds and answers with it.

-- ── 1. the sweep ───────────────────────────────────────────────────────────

UPDATE public.game_rooms r
   SET is_archived = true
 WHERE r.is_archived IS NOT TRUE
   AND r.status::text IN ('waiting', 'playing')
   AND COALESCE(r.last_activity_at, r.created_at) < now() - interval '7 days'
   AND (
     SELECT count(*) FROM public.room_participants rp WHERE rp.room_id = r.id
   ) <= 1;

-- ── 2. the standing rule ───────────────────────────────────────────────────
--
-- Same function as 20260923100000, with one clause added at the end of the
-- WHERE. Everything above it is unchanged and is repeated here because
-- CREATE OR REPLACE takes the whole body.

CREATE OR REPLACE FUNCTION public.public_rooms(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id uuid,
  room_code text,
  room_name text,
  room_icon text,
  game_type_key text,
  game_mode text,
  status text,
  created_at timestamptz,
  last_activity_at timestamptz,
  host_user_id uuid,
  host_nickname text,
  host_avatar_url text,
  player_count integer,
  max_players integer,
  first_category_name text,
  first_category_icon text,
  my_state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.room_code,
    r.room_name,
    r.room_icon,
    r.game_type_key,
    r.game_mode,
    r.status::text,
    r.created_at,
    r.last_activity_at,
    r.host_user_id,
    p.nickname,
    p.avatar_url,
    (SELECT count(*)::integer FROM room_participants rp WHERE rp.room_id = r.id),
    r.max_players,
    COALESCE(q.category_name, r.category_name),
    q.icon_slug,
    CASE
      WHEN r.host_user_id = auth.uid() THEN 'host'
      WHEN EXISTS (
        SELECT 1 FROM room_participants rp
         WHERE rp.room_id = r.id AND rp.user_id = auth.uid()
      ) THEN 'joined'
      ELSE COALESCE(
        (SELECT jr.status FROM room_join_requests jr
          WHERE jr.room_id = r.id AND jr.user_id = auth.uid()),
        'none')
    END
  FROM game_rooms r
  JOIN profiles p ON p.user_id = r.host_user_id
  LEFT JOIN LATERAL (
    SELECT rcq.category_name, rcq.icon_slug
      FROM room_category_queue rcq
     WHERE rcq.room_id = r.id
     ORDER BY rcq.position
     LIMIT 1
  ) q ON true
  WHERE r.is_public
    AND r.is_archived IS NOT TRUE
    AND r.status::text IN ('waiting', 'playing')
    AND NOT EXISTS (
      SELECT 1 FROM room_join_requests b
       WHERE b.room_id = r.id
         AND b.user_id = auth.uid()
         AND b.status = 'blocked'
    )
    -- Untouched for a week: never anyone but the host, and quiet since.
    -- The sweep above cleared the backlog; this keeps it clear, and holds
    -- even for a room the sweep archived and a client later un-archived.
    AND NOT (
      COALESCE(r.last_activity_at, r.created_at) < now() - interval '7 days'
      AND (
        SELECT count(*) FROM room_participants rp2 WHERE rp2.room_id = r.id
      ) <= 1
    )
  ORDER BY COALESCE(r.last_activity_at, r.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
$$;

REVOKE ALL ON FUNCTION public.public_rooms(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_rooms(integer) TO authenticated;
