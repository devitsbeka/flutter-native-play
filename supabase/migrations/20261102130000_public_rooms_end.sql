-- A public room ends with its play, server-side.
--
-- A public room is made for one play: a match of one round or many, and
-- then only as many rematches as the people at the table accept (owner:
-- "hosts are creating public rooms for one play ... after all ends room
-- should be deleted"). The client closes it on the paths it can see — the
-- host's back arrow off the results screen, a rejoin an hour later. It
-- cannot see the host who put the phone down on the results screen and
-- never came back, and that room stayed `completed` for good: never on the
-- Public tab (only waiting/playing are listed), but on the host's own list
-- for ever, and never swept — the week-old sweep only takes rooms nobody
-- but the host ever sat in.
--
-- One rule, here, for when a public room is OVER, and two things built on
-- it:
--
--   1. `public_rooms` refuses to list a room the rule says is over, so the
--      Public tab is right even for a client that predates this file.
--   2. `sweep_ended_public_rooms()` closes them — cancelled, so every
--      client that still holds one is told "room was closed" the way the
--      host's own back arrow tells them, and archived, which every listing
--      already hides. The app calls it before it reads the Public tab, so
--      the list is swept as often as it is read. Archived rather than
--      deleted, as 20261013100000 argued: deleting takes the rounds and the
--      pot ledger with it.
--
-- Over means: public, not already closed, quiet for an hour by every stamp
-- the row carries (the same hour the client's `isRoomStale` uses), and
-- either mid-round or finished — or back in `waiting` with nothing to play
-- after having been played. That last clause is what a rematch that nobody
-- took looks like. A waiting room with a category, a trivia or a queue is
-- the next game, and stays. A private room is never over: those are the
-- players' own and keep their reset-to-lobby.

-- ── the rule ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.public_room_is_over(r public.game_rooms)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT r.is_public IS TRUE
     AND r.is_archived IS NOT TRUE
     AND r.status::text <> 'cancelled'
     -- GREATEST skips nulls: the latest of whatever the row records.
     AND GREATEST(r.created_at, r.last_activity_at, r.started_at, r.completed_at)
         < now() - interval '1 hour'
     AND (
       r.status::text IN ('playing', 'completed')
       OR (
         r.status::text = 'waiting'
         AND r.category_id IS NULL
         AND r.user_trivia_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.room_category_queue q WHERE q.room_id = r.id
         )
         -- Played: a round start or a completion stamped activity past the
         -- room's creation. A room the host is still building has its
         -- creation for activity and is not this.
         AND r.last_activity_at > r.created_at + interval '1 minute'
       )
     );
$$;

REVOKE ALL ON FUNCTION public.public_room_is_over(public.game_rooms) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_room_is_over(public.game_rooms) TO authenticated;

-- ── the sweep ──────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER because the rows it closes are other hosts' rooms, which
-- the caller's policies rightly refuse. What it may do is bounded by the
-- rule above, which any caller could at most hasten, never widen.

CREATE OR REPLACE FUNCTION public.sweep_ended_public_rooms()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH closed AS (
    UPDATE public.game_rooms r
       SET status = 'cancelled',
           is_archived = true
     WHERE public.public_room_is_over(r)
    RETURNING r.id
  )
  SELECT count(*) INTO n FROM closed;
  RETURN COALESCE(n, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_ended_public_rooms() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sweep_ended_public_rooms() TO authenticated;

-- ── the listing ────────────────────────────────────────────────────────────
--
-- Same function as 20261013100000, with `NOT public_room_is_over(r)` added
-- at the end of the WHERE. Everything above it is unchanged and is repeated
-- here because CREATE OR REPLACE takes the whole body.

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
    AND NOT (
      COALESCE(r.last_activity_at, r.created_at) < now() - interval '7 days'
      AND (
        SELECT count(*) FROM room_participants rp2 WHERE rp2.room_id = r.id
      ) <= 1
    )
    -- Over: played, and an hour past anyone coming back for a rematch.
    AND NOT public.public_room_is_over(r)
  ORDER BY COALESCE(r.last_activity_at, r.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
$$;

REVOKE ALL ON FUNCTION public.public_rooms(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_rooms(integer) TO authenticated;

-- ── the backlog ────────────────────────────────────────────────────────────

SELECT public.sweep_ended_public_rooms();
