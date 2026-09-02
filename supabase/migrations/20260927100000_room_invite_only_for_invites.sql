-- ============================================================
-- An invitation is a row somebody ELSE wrote for you.
--
-- notify_room_invite fired on EVERY room_participants insert, so a player
-- walking into a room on their own — joining by code, approved off the
-- Public tab, the assigned-seat repair — mailed THEMSELVES a "Game Room
-- Invitation" for the room they were already standing in (rendered in the
-- activity list as a bare room code). Only rows written at status
-- 'invited' are invitations, and the sender named is whoever wrote the
-- row (seated participants may invite too — 20260921220000), falling
-- back to the host.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_room_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  room_record RECORD;
  sender_profile RECORD;
  v_sender uuid;
BEGIN
  -- Joining under your own steam is not an invitation.
  IF NEW.status IS DISTINCT FROM 'invited' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO room_record FROM game_rooms WHERE id = NEW.room_id;

  -- The host needs no invitation to their own room.
  IF NEW.user_id = room_record.host_user_id THEN
    RETURN NEW;
  END IF;

  -- Whoever wrote the row is the inviter; a definer-context write with no
  -- auth (server jobs) reads as the host.
  v_sender := COALESCE(auth.uid(), room_record.host_user_id);
  IF v_sender = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT nickname, avatar_url INTO sender_profile
  FROM profiles WHERE user_id = v_sender;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'room_invite',
    'Game Room Invitation',
    COALESCE(sender_profile.nickname, 'A player') || ' invited you to play!',
    jsonb_build_object(
      'room_id', NEW.room_id,
      'room_code', room_record.room_code,
      'room_name', room_record.room_name,
      'room_icon', room_record.room_icon,
      'category_name', room_record.category_name,
      'host_user_id', room_record.host_user_id,
      'sender_nickname', sender_profile.nickname,
      'sender_avatar', sender_profile.avatar_url
    )
  );

  RETURN NEW;
END;
$function$;
