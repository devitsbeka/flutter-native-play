-- The two halves of a friendship nobody was ever told about.
--
-- notify_friend_request() has always written one row, to the person receiving
-- the request. So the Friends tab of the activity screen is empty for anyone
-- who does the inviting: you send requests, nothing is written for you, and
-- the tab says "no friend notifications" even though you spent the evening
-- adding people.
--
-- Worse, nothing anywhere wrote 'friend_accepted'. The type is named in the
-- notifications table comment, has an icon and a colour in
-- notificationConfig.ts and a translation in both locales, and no code path in
-- the app or the database ever produced one. Accepting a request told the
-- person who sent it precisely nothing.
--
-- Both are written here rather than from the client for the usual reason: a
-- client cannot insert a notification row for another account and have RLS
-- allow it, which is how the referral flow failed silently for months.

-- ── 1. Sending: tell both sides ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_profile    record;
  recipient_profile record;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT nickname, avatar_url INTO sender_profile
  FROM profiles WHERE user_id = NEW.user_id;

  SELECT nickname, avatar_url INTO recipient_profile
  FROM profiles WHERE user_id = NEW.friend_id;

  -- The recipient, as before.
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

  -- And the sender, so their own Friends tab shows what they did. Named
  -- sender_nickname even though it holds the *recipient* — that is the field
  -- every notification in this app fills {name} from, and inventing a second
  -- one here would mean the row rendered as "someone".
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'friend_request_sent',
    'Request sent',
    'You asked ' || COALESCE(recipient_profile.nickname, 'someone') || ' to be friends',
    jsonb_build_object(
      'friendship_id', NEW.id,
      'recipient_id', NEW.friend_id,
      'sender_nickname', recipient_profile.nickname,
      'sender_avatar', recipient_profile.avatar_url
    )
  );

  RETURN NEW;
END;
$$;

-- ── 2. Accepting: tell whoever asked ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accepter_profile record;
BEGIN
  SELECT nickname, avatar_url INTO accepter_profile
  FROM profiles WHERE user_id = NEW.friend_id;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'friend_accepted',
    'Friend added',
    COALESCE(accepter_profile.nickname, 'Someone') || ' accepted your friend request',
    jsonb_build_object(
      'friendship_id', NEW.id,
      'sender_id', NEW.friend_id,
      'sender_nickname', accepter_profile.nickname,
      'sender_avatar', accepter_profile.avatar_url
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friend_request_accepted ON public.friendships;
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE OF status ON public.friendships
  FOR EACH ROW
  -- Only the pending → accepted edge. Without the OLD check, any later update
  -- to an accepted row writes the notification again.
  WHEN (OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted')
  EXECUTE FUNCTION public.notify_friend_accepted();
