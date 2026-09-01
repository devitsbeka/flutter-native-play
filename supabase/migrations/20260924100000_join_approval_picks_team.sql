-- The host says which side an approved player lands on.
--
-- Approving somebody into the arena seated them with no team, and the
-- joiner's own device then picked the emptier side when it noticed. The
-- host is the one looking at the two teams when they say yes — "with me or
-- against me" is the decision, and it belongs on the same tap.
--
-- Dropped and recreated rather than replaced: a third parameter is a
-- different signature, and CREATE OR REPLACE on the new one would leave the
-- old two-argument function standing beside it. PostgREST then has two
-- candidates for a call that names only the first two arguments, and
-- answers with an ambiguity error instead of picking either. The default
-- keeps every existing two-argument caller — the classic lobby, the King's
-- couch, the SQL suite — working unchanged.

DROP FUNCTION IF EXISTS public.respond_room_join(uuid, boolean);
-- And its own signature, so a second run of this file is a no-op rather
-- than "already exists with same argument types".
DROP FUNCTION IF EXISTS public.respond_room_join(uuid, boolean, text);

CREATE FUNCTION public.respond_room_join(
  p_request_id uuid,
  p_approve boolean,
  p_team text DEFAULT NULL
)
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
  IF p_team IS NOT NULL AND p_team NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'no such team';
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
    INSERT INTO room_participants (room_id, user_id, nickname, avatar_url, country_code, is_host, status, team)
    VALUES (v_req.room_id, v_req.user_id, COALESCE(v_them.nickname, 'Player'), v_them.avatar_url,
            COALESCE(v_them.country_code, 'GE'), false, 'joined', p_team)
    ON CONFLICT (room_id, user_id) DO UPDATE
      SET status = 'joined',
          -- A side named now wins; one left unsaid keeps whatever the row
          -- already had (an invited seat may carry the team it was
          -- reserved for).
          team = COALESCE(EXCLUDED.team, room_participants.team);
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

REVOKE ALL ON FUNCTION public.respond_room_join(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_room_join(uuid, boolean, text) TO authenticated;
