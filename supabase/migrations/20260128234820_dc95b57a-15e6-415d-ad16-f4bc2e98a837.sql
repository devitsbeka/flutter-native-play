-- Update notify_room_invite trigger to use consistent sender_avatar field name
CREATE OR REPLACE FUNCTION public.notify_room_invite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  room_record RECORD;
  sender_profile RECORD;
BEGIN
  -- Get room details
  SELECT * INTO room_record FROM game_rooms WHERE id = NEW.room_id;
  
  -- Get sender profile (nickname + avatar)
  SELECT nickname, avatar_url INTO sender_profile 
  FROM profiles WHERE user_id = room_record.host_user_id;
  
  -- Don't create notification if user is the host
  IF NEW.user_id = room_record.host_user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification with sender info (using sender_avatar for consistency)
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
      'category_name', room_record.category_name,
      'host_user_id', room_record.host_user_id,
      'sender_nickname', sender_profile.nickname,
      'sender_avatar', sender_profile.avatar_url
    )
  );
  
  RETURN NEW;
END;
$function$;