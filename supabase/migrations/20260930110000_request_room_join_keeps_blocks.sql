-- Restore the block guard that the open-rooms rewrite dropped.
--
-- `20260923100000_battle_teams_and_blocks` taught request_room_join a wall:
-- a host who blocks a knocker sets that request to 'blocked', and the
-- function answers 'blocked' — no second knock, no notification, no seat —
-- ever after.
--
-- `20260930100000_open_rooms` rewrote request_room_join to seat the caller
-- of an open room at once, but it built on the ORIGINAL function, before the
-- block guard existed, and so silently lost it: a blocked player who asked
-- again fell straight through to the pending upsert (which overwrites the
-- 'blocked' row with 'pending'), re-appearing in the host's lobby they had
-- already been thrown out of. On an OPEN room it is worse still — no
-- approval stands between the ask and the seat, so the block bought nothing.
--
-- Same function, both truths kept: the block is checked first, before any
-- other answer (an open room does not seat somebody its host removed), and
-- an unrestricted room still seats everyone else the moment they ask.

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

  -- The wall comes before every other answer: a block outranks even an open
  -- room's open door. (This is the guard the open-rooms rewrite lost.)
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

  -- The room is full: say so rather than seating an eleventh player or
  -- queueing an ask nobody can grant.
  IF (SELECT count(*) FROM room_participants rp WHERE rp.room_id = p_room_id)
       >= COALESCE(v_room.max_players, 10) THEN
    RAISE EXCEPTION 'that room is full';
  END IF;

  -- An open room (the host never asked to be consulted), an invitation, or
  -- an approval given earlier and never used: seat the caller at once.
  IF NOT v_room.requires_approval
     OR EXISTS (SELECT 1 FROM game_invitations gi
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

-- A SECURITY DEFINER function is granted to PUBLIC by default (CLAUDE.md
-- rule 3). CREATE OR REPLACE keeps the grants this already had, but state
-- them anyway so the file is true on a fresh database.
REVOKE ALL ON FUNCTION public.request_room_join(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_room_join(uuid) TO authenticated;
