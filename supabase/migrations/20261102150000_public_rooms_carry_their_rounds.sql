-- A public card can say what the whole room plays, not just its first round.
--
-- Tapping a room card now opens what it is: every round in order, the
-- questions per round, and what a seat costs (owner: "show +X if there are
-- more rounds in the room selected and clicking on card would show
-- categories picked in this room ... click on card shows categories list and
-- cost for participating"). The card itself carries a "+2" beside the first
-- round so the list says how much there is before anything is opened.
--
-- The client cannot read that for a room it has not joined:
-- room_category_queue's only SELECT policy is "Participants can view queue".
-- Deliberate — a queue is the room's business — and this function is
-- SECURITY DEFINER precisely so a stranger can be told what a PUBLIC room
-- advertises without being given the table. It already reached in for the
-- first round; it returns the whole list now.
--
-- `rounds` is a jsonb array in play order, each entry
--   { "name": text|null, "icon_slug": text|null, "source_type": text }
-- with the room's own category as the single round when its queue is empty —
-- the same fallback first_category_name already makes, so the card and the
-- sheet cannot disagree about what round one is.
--
-- Everything else is unchanged and reproduced verbatim: CREATE OR REPLACE
-- takes the whole body, and this one carries the tab's whole filter — the
-- block list, the week-old empties, the rooms that are over.

DROP FUNCTION IF EXISTS public.public_rooms(integer);

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
  my_state text,
  -- New: what the room plays, and how long each round is.
  rounds jsonb,
  total_questions integer
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
    END,
    COALESCE(
      (SELECT jsonb_agg(
                jsonb_build_object(
                  'name', rq.category_name,
                  'icon_slug', rq.icon_slug,
                  'source_type', rq.source_type)
                ORDER BY rq.position)
         FROM room_category_queue rq
        WHERE rq.room_id = r.id),
      -- No queue: the room's own category is its one round. A room with
      -- neither is playing something not yet chosen, and says so with an
      -- empty list rather than a null the card has to special-case.
      CASE
        WHEN r.category_name IS NOT NULL OR r.category_id IS NOT NULL
          THEN jsonb_build_array(
                 jsonb_build_object(
                   'name', r.category_name,
                   'icon_slug', NULL,
                   'source_type', 'category'))
        ELSE '[]'::jsonb
      END
    ),
    r.total_questions
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

-- A new SECURITY DEFINER function is executable by PUBLIC by default. This
-- one reads other people's rooms, so it is granted deliberately — and the
-- DROP above means the previous grants are gone, not inherited.
REVOKE ALL ON FUNCTION public.public_rooms(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_rooms(integer) TO authenticated;
