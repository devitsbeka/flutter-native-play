-- Open rooms: a published room anyone may walk into.
--
-- Every public room was a door you had to knock on. You tapped Join, an ask
-- went to the host, and until they looked at their phone you sat on a card
-- that said "Waiting" — for a room whose whole point is that it is listed
-- where strangers can find it. Most hosts publish a room because they want
-- somebody, anybody, in it.
--
-- So approval becomes the host's choice, and the default is off: a public
-- room is open, Join seats you, and you are in the lobby looking at the
-- players and the rules a second later. A host who wants to vet arrivals
-- turns it on, and the room behaves exactly as it did before.
--
-- FALSE is the default deliberately, and it is the safe one here: the column
-- only ever loosens a PUBLIC room, which its host published on purpose. A
-- private room ignores it entirely — its code is the permission, and
-- request_room_join still refuses one outright.

ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.game_rooms.requires_approval IS
  'Public rooms only: when true, joining goes through room_join_requests and the host approves. Default false — a listed room is open.';

-- ── joining ────────────────────────────────────────────────────────────────
--
-- Same function, one new branch: an open public room seats the caller and
-- returns ''joined'', which is the answer the client already navigates on
-- (it is what an invited player, or one holding an old approval, has always
-- got back). Everything else is untouched — the private-room refusal, the
-- invite and prior-approval shortcuts, the ask and its notification.

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

  -- The room is full: say so rather than seating an eleventh player or
  -- queueing an ask nobody can grant.
  IF (SELECT count(*) FROM room_participants rp WHERE rp.room_id = p_room_id)
       >= COALESCE(v_room.max_players, 10) THEN
    RAISE EXCEPTION 'that room is full';
  END IF;

  -- Being invited IS the host's yes, given before you asked. Same for an
  -- approval they gave earlier and you never used — and, now, for a room
  -- whose host never asked to be consulted.
  IF NOT v_room.requires_approval
     OR EXISTS (SELECT 1 FROM game_invitations gi
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

-- A SECURITY DEFINER function is granted to PUBLIC by default (CLAUDE.md
-- rule 3). CREATE OR REPLACE keeps the grants this already had, but state
-- them anyway so the file is true on a fresh database.
REVOKE ALL ON FUNCTION public.request_room_join(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_room_join(uuid) TO authenticated;
