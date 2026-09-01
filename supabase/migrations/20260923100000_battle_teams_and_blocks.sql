-- Team colours the captains choose, and a door the host can shut for good.
--
-- Two unrelated-looking things that are both about who owns what in a room:
--
--   team_a_icon / team_b_icon   the arena's two sides carry a crest, and the
--                               captain of a side picks their own — elected
--                               by their team, so the choice is theirs and
--                               not the host's;
--
--   status 'blocked'            declining a join request only answers this
--                               one knock. Somebody who keeps knocking, or
--                               who was let in and turned out to be a
--                               problem, needs an answer that sticks: a
--                               blocked player cannot ask again, and the
--                               room stops appearing in their Public tab
--                               at all.
--
-- And the counterpart to the block: leaving or being removed CLEARS an
-- approval, so getting back in means asking again. Without that, "remove"
-- was a suggestion — the approved row was still there, and the participants
-- policy would have let them walk straight back in.

-- ── the crests ─────────────────────────────────────────────────────────────

ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS team_a_icon text,
  ADD COLUMN IF NOT EXISTS team_b_icon text;

-- Not a client UPDATE on game_rooms: that policy is host-only, and the whole
-- point is that the captain of a side picks their own side's crest. The host
-- can too — somebody has to be able to, on a team that has not voted yet.
CREATE OR REPLACE FUNCTION public.tb_set_team_icon(
  p_room_id uuid,
  p_team text,
  p_icon text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;
  IF p_team NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'no such team';
  END IF;
  IF p_icon IS NOT NULL AND length(p_icon) > 500 THEN
    RAISE EXCEPTION 'that is not an icon';
  END IF;

  IF NOT EXISTS (
        SELECT 1 FROM game_rooms r
         WHERE r.id = p_room_id AND r.host_user_id = v_uid
      )
     AND NOT EXISTS (
        SELECT 1 FROM room_participants rp
         WHERE rp.room_id = p_room_id
           AND rp.user_id = v_uid
           AND rp.team = p_team
           AND rp.is_captain
      ) THEN
    RAISE EXCEPTION 'only that team''s captain sets its crest';
  END IF;

  UPDATE game_rooms
     SET team_a_icon = CASE WHEN p_team = 'a' THEN p_icon ELSE team_a_icon END,
         team_b_icon = CASE WHEN p_team = 'b' THEN p_icon ELSE team_b_icon END
   WHERE id = p_room_id;
END $$;

REVOKE ALL ON FUNCTION public.tb_set_team_icon(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_set_team_icon(uuid, text, text) TO authenticated;

-- ── the door that stays shut ───────────────────────────────────────────────

ALTER TABLE public.room_join_requests
  DROP CONSTRAINT IF EXISTS room_join_requests_status_check;
ALTER TABLE public.room_join_requests
  ADD CONSTRAINT room_join_requests_status_check
  CHECK (status IN ('pending', 'approved', 'declined', 'blocked'));

CREATE OR REPLACE FUNCTION public.block_room_join(p_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req room_join_requests%ROWTYPE;
  v_room game_rooms%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;

  SELECT * INTO v_req FROM room_join_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such request';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = v_req.room_id;
  IF v_room.host_user_id <> v_uid THEN
    RAISE EXCEPTION 'only the host answers this';
  END IF;
  IF v_req.user_id = v_uid THEN
    RAISE EXCEPTION 'you cannot block yourself out of your own room';
  END IF;

  UPDATE room_join_requests
     SET status = 'blocked', responded_at = now()
   WHERE id = p_request_id;

  -- A block also empties their seat, for the case where the host is
  -- blocking somebody they had already let in. The delete trigger below
  -- leaves a blocked row alone, so this does not undo the block.
  DELETE FROM room_participants
   WHERE room_id = v_req.room_id AND user_id = v_req.user_id;

  -- Told the same thing a decline says. A block that announces itself is an
  -- invitation to argue about it, and the person on the other end learns
  -- the same practical fact either way: they are not getting in.
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_req.user_id,
    'room_join_declined',
    COALESCE(v_room.room_name, v_room.room_code),
    NULL,
    jsonb_build_object(
      'kind', 'room_join_declined',
      'room_id', v_room.id,
      'room_code', v_room.room_code,
      'room_name', v_room.room_name,
      'game_type_key', v_room.game_type_key
    )
  );

  RETURN 'blocked';
END $$;

REVOKE ALL ON FUNCTION public.block_room_join(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_room_join(uuid) TO authenticated;

-- ── leaving forgets the yes ────────────────────────────────────────────────

-- A trigger rather than a line inside lobby_manage_seat, because there are
-- several ways a seat empties — the host removes you, you leave, a lounge
-- clears a pending invite — and every one of them has to mean the same
-- thing: the permission you were given is spent. A blocked row is the
-- exception, since that one is not a permission at all.
CREATE OR REPLACE FUNCTION public.clear_join_request_on_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM room_join_requests
   WHERE room_id = OLD.room_id
     AND user_id = OLD.user_id
     AND status <> 'blocked';
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS room_participants_clear_join_request ON public.room_participants;
CREATE TRIGGER room_participants_clear_join_request
  AFTER DELETE ON public.room_participants
  FOR EACH ROW EXECUTE FUNCTION public.clear_join_request_on_leave();

-- ── the two functions that have to know about blocks ───────────────────────

-- A blocked player does not see the room at all. Hiding it is most of what
-- makes a block stick: a list they cannot see is a room they cannot knock
-- on, whatever the button would have done.
-- Dropped rather than replaced: this adds a column to the returned row, and
-- CREATE OR REPLACE cannot change a function's return type — it fails the
-- whole statement and leaves the previous definition standing, so the block
-- filter below would have been silently absent while everything else in
-- this file applied.
DROP FUNCTION IF EXISTS public.public_rooms(integer);

CREATE FUNCTION public.public_rooms(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id uuid,
  room_code text,
  room_name text,
  room_icon text,
  game_type_key text,
  -- Words rooms are told apart by game_mode as well as by the key: until
  -- the game_types catalog row is applied the key is null and the mode is
  -- 'words' (20260901120000). roomRoutes.roomKind reads both, and without
  -- this column a published Words room's card would open the classic lobby.
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
  ORDER BY COALESCE(r.last_activity_at, r.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
$$;

REVOKE ALL ON FUNCTION public.public_rooms(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_rooms(integer) TO authenticated;

-- And the knock itself is refused, for the stale list and the shared link.
CREATE OR REPLACE FUNCTION public.request_room_join(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_room game_rooms%ROWTYPE;
  v_me profiles%ROWTYPE;
  v_status text;
  v_existing text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such room';
  END IF;
  IF v_room.is_archived IS TRUE OR v_room.status::text = 'cancelled' THEN
    RAISE EXCEPTION 'that room is closed';
  END IF;

  SELECT status INTO v_existing FROM room_join_requests
   WHERE room_id = p_room_id AND user_id = v_uid;
  IF v_existing = 'blocked' THEN
    RETURN 'blocked';
  END IF;

  SELECT * INTO v_me FROM profiles WHERE user_id = v_uid;

  -- Already seated, or it is your own room: nothing to ask.
  IF v_room.host_user_id = v_uid
     OR EXISTS (SELECT 1 FROM room_participants rp
                 WHERE rp.room_id = p_room_id AND rp.user_id = v_uid) THEN
    RETURN 'joined';
  END IF;

  -- A private room is joined the way it always was — whoever gave you the
  -- code already said yes. This function is for the published ones.
  IF NOT v_room.is_public THEN
    RAISE EXCEPTION 'that room is not public';
  END IF;

  -- Being invited IS the host's yes, given before you asked. Same for an
  -- approval they gave earlier and you never used — though leaving the room
  -- spends it (see the trigger above), so this only covers an approval that
  -- was never taken up.
  IF EXISTS (SELECT 1 FROM game_invitations gi
              WHERE gi.room_id = p_room_id
                AND gi.receiver_id = v_uid
                AND gi.status <> 'declined')
     OR v_existing = 'approved' THEN
    INSERT INTO room_participants (room_id, user_id, nickname, avatar_url, country_code, is_host, status)
    VALUES (p_room_id, v_uid, COALESCE(v_me.nickname, 'Player'), v_me.avatar_url,
            COALESCE(v_me.country_code, 'GE'), false, 'joined')
    ON CONFLICT (room_id, user_id) DO UPDATE SET status = 'joined';
    RETURN 'joined';
  END IF;

  INSERT INTO room_join_requests (room_id, user_id, status, created_at, responded_at)
  VALUES (p_room_id, v_uid, 'pending', now(), NULL)
  ON CONFLICT (room_id, user_id) DO UPDATE
    SET status = 'pending', created_at = now(), responded_at = NULL
  RETURNING status INTO v_status;

  -- The host may not be looking at the lobby, so the ask is also a
  -- notification. room_code rides along because that is what the panel
  -- navigates with.
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_room.host_user_id,
    'room_join_request',
    COALESCE(v_me.nickname, 'Someone'),
    COALESCE(v_room.room_name, v_room.room_code),
    jsonb_build_object(
      'kind', 'room_join_request',
      'room_id', p_room_id,
      'room_code', v_room.room_code,
      'room_name', v_room.room_name,
      'requester_id', v_uid,
      'sender_nickname', v_me.nickname,
      'sender_avatar_url', v_me.avatar_url
    )
  );

  RETURN COALESCE(v_status, 'pending');
END $$;

REVOKE ALL ON FUNCTION public.request_room_join(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_room_join(uuid) TO authenticated;
