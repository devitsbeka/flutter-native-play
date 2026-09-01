-- Public rooms, and the host's permission to enter one.
--
-- Until now every room was private in practice: you got in with a code, a
-- link or an invite, and the games list only ever showed rooms you were
-- already in. A room can now be published instead — it appears on the
-- Public tab of the online-game page for everyone, with its first round's
-- category, its host, and how many seats are taken.
--
-- Publishing a room is not the same as opening it. A stranger who taps
-- "join" on a public room asks; the host sees who is asking, can look at
-- their profile, and lets them in or does not. Three pieces make that real:
--
--   room_join_requests   one row per (room, asker), written only by the two
--                        functions below — never by a client;
--   request_room_join    the ask, which short-circuits to a straight join
--                        for anyone already seated, invited, or previously
--                        approved;
--   respond_room_join    the host's answer, which is the only thing that
--                        seats an approved player.
--
-- And the participants policy is tightened to match: without it the whole
-- ritual would be advisory, because "Authenticated users can join rooms"
-- let anyone insert themselves into any room by id. Private rooms keep
-- exactly the behaviour they had — a code is still an invitation — and only
-- published rooms require the host's yes.

-- ── the flag ───────────────────────────────────────────────────────────────

-- Default false, which does two jobs. Every room that already exists stays
-- private (a backfill to true would publish all of them at once), and every
-- code path that creates a room without an opinion — matchmaking duels, the
-- challenge rooms, anything added later — keeps making private rooms. The
-- create screen's switch is what publishes one, and it says so explicitly;
-- a default of true would mean any path anyone forgets to update publishes
-- its rooms silently, and that mistake only shows up as a stranger in
-- someone's lobby.
ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS game_rooms_public_idx
  ON public.game_rooms (last_activity_at DESC NULLS LAST)
  WHERE is_public;

-- ── the asks ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.room_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_join_requests_room_pending_idx
  ON public.room_join_requests (room_id)
  WHERE status = 'pending';

ALTER TABLE public.room_join_requests ENABLE ROW LEVEL SECURITY;

-- Reading only, and only your own side of it: the asker sees their own
-- requests (that is how their button knows to say "waiting"), the host sees
-- the ones aimed at their rooms (that is what raises the modal). There is
-- deliberately no INSERT/UPDATE/DELETE policy — a client that could write
-- this table could approve itself.
DROP POLICY IF EXISTS "Askers read their own join requests" ON public.room_join_requests;
CREATE POLICY "Askers read their own join requests" ON public.room_join_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts read join requests for their rooms" ON public.room_join_requests;
CREATE POLICY "Hosts read join requests for their rooms" ON public.room_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_rooms r
       WHERE r.id = room_join_requests.room_id
         AND r.host_user_id = auth.uid()
    )
  );

-- The host's modal is raised by a postgres_changes subscription on this
-- table, so it has to be in the publication and carry full rows.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_join_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.room_join_requests;
END $$;

ALTER TABLE public.room_join_requests REPLICA IDENTITY FULL;

-- ── who may seat themselves ────────────────────────────────────────────────

-- room_participants carried TWO insert policies, and policies are OR-ed:
-- "Authenticated users can join rooms" (auth.uid() = user_id, from the
-- original schema) and "Users can join or be invited to rooms" (the same
-- clause again, plus the host and the seated-player invite arms). Narrowing
-- one of them would have changed nothing at all — the other still said yes,
-- which is exactly the sort of gate that passes review and holds nothing.
-- They collapse into the single policy below.
--
-- The three arms are the three legitimate reasons a row appears here:
--
--   the host seats whoever they like in their own room;
--   a seated player invites someone, greyed until they accept;
--   you seat yourself — always in a private room, because knowing its id
--   means somebody gave you the code, and in a published one only with the
--   host's yes (their approval, their invitation, or your own room).
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can join or be invited to rooms" ON public.room_participants;

CREATE POLICY "Users can join or be invited to rooms"
ON public.room_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.game_rooms gr
     WHERE gr.id = room_participants.room_id AND gr.host_user_id = auth.uid()
  )
  OR (
    status = 'invited'
    AND COALESCE(is_bot, false) = false
    AND COALESCE(is_host, false) = false
    AND EXISTS (
      SELECT 1 FROM public.room_participants me
       WHERE me.room_id = room_participants.room_id
         AND me.user_id = auth.uid()
         AND me.status IN ('joined', 'ready', 'playing')
         AND NOT COALESCE(me.is_bot, false)
    )
  )
  OR (
    auth.uid() = user_id
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.game_rooms r
         WHERE r.id = room_participants.room_id AND r.is_public
      )
      OR EXISTS (
        SELECT 1 FROM public.room_join_requests q
         WHERE q.room_id = room_participants.room_id
           AND q.user_id = auth.uid()
           AND q.status = 'approved'
      )
      OR EXISTS (
        SELECT 1 FROM public.game_invitations gi
         WHERE gi.room_id = room_participants.room_id
           AND gi.receiver_id = auth.uid()
           AND gi.status <> 'declined'
      )
    )
  )
);

-- ── the list ───────────────────────────────────────────────────────────────

-- One call for the whole Public tab. Done client-side this was a room query,
-- a participants query, a profiles query and a queue query per page of
-- results, and the seat count — the thing the card is really for — would
-- have been the last of them to arrive.
--
-- first_category_* is what the room will actually play next: the head of its
-- round queue when the host has queued rounds, otherwise the category the
-- room itself carries.
CREATE OR REPLACE FUNCTION public.public_rooms(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id uuid,
  room_code text,
  room_name text,
  room_icon text,
  game_type_key text,
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
  ORDER BY COALESCE(r.last_activity_at, r.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
$$;

REVOKE ALL ON FUNCTION public.public_rooms(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_rooms(integer) TO authenticated;

-- ── the ask ────────────────────────────────────────────────────────────────

-- Returns what the caller should do next, not whether a row was written:
--   'joined'  — you are in the room; go to it
--   'pending' — the host has been asked
--   'declined'— they said no and have not been asked again
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
  -- approval they gave earlier and you never used.
  IF EXISTS (SELECT 1 FROM game_invitations gi
              WHERE gi.room_id = p_room_id
                AND gi.receiver_id = v_uid
                AND gi.status <> 'declined')
     OR EXISTS (SELECT 1 FROM room_join_requests jr
                 WHERE jr.room_id = p_room_id
                   AND jr.user_id = v_uid
                   AND jr.status = 'approved') THEN
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

-- ── the answer ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.respond_room_join(p_request_id uuid, p_approve boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req room_join_requests%ROWTYPE;
  v_room game_rooms%ROWTYPE;
  v_them profiles%ROWTYPE;
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

  UPDATE room_join_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
         responded_at = now()
   WHERE id = p_request_id;

  IF p_approve THEN
    SELECT * INTO v_them FROM profiles WHERE user_id = v_req.user_id;
    INSERT INTO room_participants (room_id, user_id, nickname, avatar_url, country_code, is_host, status)
    VALUES (v_req.room_id, v_req.user_id, COALESCE(v_them.nickname, 'Player'), v_them.avatar_url,
            COALESCE(v_them.country_code, 'GE'), false, 'joined')
    ON CONFLICT (room_id, user_id) DO UPDATE SET status = 'joined';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_req.user_id,
    CASE WHEN p_approve THEN 'room_join_approved' ELSE 'room_join_declined' END,
    COALESCE(v_room.room_name, v_room.room_code),
    NULL,
    jsonb_build_object(
      'kind', CASE WHEN p_approve THEN 'room_join_approved' ELSE 'room_join_declined' END,
      'room_id', v_room.id,
      'room_code', v_room.room_code,
      'room_name', v_room.room_name,
      'game_type_key', v_room.game_type_key
    )
  );

  RETURN CASE WHEN p_approve THEN 'approved' ELSE 'declined' END;
END $$;

REVOKE ALL ON FUNCTION public.respond_room_join(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_room_join(uuid, boolean) TO authenticated;
