-- Seat management for the lounge lobbies (Team Battle and King rooms).
--
-- RLS on room_participants is deliberately own-row-only, so the host could
-- never remove a pending invite, kick a seat, or rearrange teams. This is
-- the one narrow power tool: the HOST of a WAITING room may remove any
-- non-host participant (pending invitee, joined human, or bot) or move a
-- participant to a team. Match-time state is untouched — tb_start_match
-- still counts only joined/ready/playing rows, so pending invitees never
-- affect the equal-teams rule.

CREATE OR REPLACE FUNCTION public.lobby_manage_seat(
  p_room_id uuid,
  p_user_id uuid,
  p_action  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_status text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'LOBBY_NOT_AUTHENTICATED';
  END IF;
  IF p_action NOT IN ('remove', 'move_a', 'move_b') THEN
    RAISE EXCEPTION 'LOBBY_BAD_ACTION';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = v_caller AND is_host
  ) THEN
    RAISE EXCEPTION 'LOBBY_NOT_HOST';
  END IF;
  SELECT status INTO v_status FROM public.game_rooms WHERE id = p_room_id;
  IF v_status IS DISTINCT FROM 'waiting' THEN
    RAISE EXCEPTION 'LOBBY_NOT_WAITING';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'LOBBY_NOT_A_PARTICIPANT';
  END IF;

  IF p_action = 'remove' THEN
    IF p_user_id = v_caller THEN
      RAISE EXCEPTION 'LOBBY_HOST_CANNOT_REMOVE_SELF';
    END IF;
    DELETE FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = p_user_id;
  ELSE
    UPDATE public.room_participants
       SET team = CASE p_action WHEN 'move_a' THEN 'a' ELSE 'b' END,
           is_captain = false
     WHERE room_id = p_room_id AND user_id = p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.lobby_manage_seat(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lobby_manage_seat(uuid, uuid, text) TO authenticated;
