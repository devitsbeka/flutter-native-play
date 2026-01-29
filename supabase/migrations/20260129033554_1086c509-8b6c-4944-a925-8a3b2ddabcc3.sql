-- Update notify_room_invite trigger to include room_icon
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
  
  -- Create notification with sender info and room_icon
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

-- Update notify_game_started trigger to include room_icon
CREATE OR REPLACE FUNCTION public.notify_game_started()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  room_record RECORD;
  host_profile RECORD;
  participant RECORD;
BEGIN
  -- Get room details
  SELECT * INTO room_record FROM game_rooms WHERE id = NEW.room_id;
  
  -- Get host profile
  SELECT nickname, avatar_url INTO host_profile 
  FROM profiles WHERE user_id = room_record.host_user_id;
  
  -- Notify all participants except the host
  FOR participant IN 
    SELECT rp.user_id FROM room_participants rp 
    WHERE rp.room_id = NEW.room_id AND rp.user_id != room_record.host_user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      participant.user_id,
      'game_started',
      'Game Started!',
      COALESCE(host_profile.nickname, 'Host') || ' started a game in ' || COALESCE(room_record.room_name, 'the room') || '!',
      jsonb_build_object(
        'room_id', NEW.room_id,
        'room_code', room_record.room_code,
        'room_name', room_record.room_name,
        'room_icon', room_record.room_icon,
        'game_id', NEW.id,
        'host_user_id', room_record.host_user_id,
        'sender_nickname', host_profile.nickname,
        'sender_avatar', host_profile.avatar_url
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;