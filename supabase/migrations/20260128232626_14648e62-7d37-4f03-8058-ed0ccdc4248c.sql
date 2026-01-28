-- Create trigger function for friend request notifications
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_profile RECORD;
BEGIN
  -- Only create notification for new pending requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Get sender profile (nickname + avatar)
  SELECT nickname, avatar_url INTO sender_profile 
  FROM profiles WHERE user_id = NEW.user_id;
  
  -- Create notification for the recipient
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.friend_id,
    'friend_request',
    'Friend Request',
    COALESCE(sender_profile.nickname, 'Someone') || ' wants to be your friend!',
    jsonb_build_object(
      'friendship_id', NEW.id,
      'sender_id', NEW.user_id,
      'sender_nickname', sender_profile.nickname,
      'sender_avatar', sender_profile.avatar_url
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on friendships table
DROP TRIGGER IF EXISTS on_friend_request_sent ON friendships;
CREATE TRIGGER on_friend_request_sent
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();

-- Update game_started trigger to include host profile info
CREATE OR REPLACE FUNCTION public.notify_game_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        'game_id', NEW.id,
        'host_user_id', room_record.host_user_id,
        'sender_nickname', host_profile.nickname,
        'sender_avatar', host_profile.avatar_url
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;