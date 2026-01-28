

# Fix: Friend Request Notifications & Improve Notification Details

## Problem Analysis

After investigation, I found **two main issues**:

### Issue 1: Friend Request Notifications Never Created
There is **NO database trigger** to create notifications when a friend request is sent. The `friendships` table has no trigger like `room_invite` and `game_started` have. Looking at the code:

- `sendFriendRequest()` in `useFriends.ts` only inserts into `friendships` table
- No `createNotification()` call is made
- No database trigger exists on `friendships` table to auto-create notifications
- Query confirmed: `SELECT * FROM notifications WHERE type = 'friend_request'` returns 0 rows

### Issue 2: game_started Notifications are Too Generic
Current `game_started` notifications show:
- **Title**: "თამაში დაიწყო!" (Game Started!)
- **Message**: "A game has started in [room_name]!" (English)
- **Data**: Only contains `room_id`, `room_code`, `game_id` - NO sender info

The `room_invite` notifications correctly include sender info, but `game_started` doesn't have `sender_nickname` or `sender_avatar` in the data.

---

## Solution

### Part 1: Create Friend Request Notification Trigger

Add a database trigger on `friendships` table to automatically create notifications:

```sql
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

CREATE TRIGGER on_friend_request_sent
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();
```

### Part 2: Update game_started Trigger to Include Host Info

Update the `notify_game_started()` function:

```sql
CREATE OR REPLACE FUNCTION public.notify_game_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
```

### Part 3: Update UI to Display Sender Info

**Update `CompactNotificationCard.tsx`:**

Currently, `room_invite` has special handling for `senderName`, but `friend_request` and `game_started` don't display it properly.

Add sender info display for all notification types:
- Show sender's avatar in the avatar slot
- Show sender's nickname in the message
- For `game_started`: show "{name} started a game in {room_name}"
- For `friend_request`: show "{name} wants to be your friend"

**Update `notificationTranslations.ts`:**

Add translations for dynamic content with sender names:
```typescript
const messageMap: Record<string, string> = {
  'game_started': 'notifications.gameStartedBy', // NEW
  'room_invite': 'notifications.invitedYouToPlay',
  'friend_request': 'notifications.friendRequestFrom', // NEW
};
```

**Update `ka.ts` locale:**

Add new translation keys:
```typescript
notifications: {
  // Existing...
  gameStartedBy: "{name} დაიწყო თამაში ოთახში: {room}!",
  friendRequestFrom: "{name} გთხოვს მეგობრობას!",
  // ...
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| **New SQL Migration** | Create `notify_friend_request` trigger on friendships table |
| **New SQL Migration** | Update `notify_game_started` to include host profile data |
| `src/components/notifications/CompactNotificationCard.tsx` | Display sender info for friend_request and game_started types |
| `src/utils/notificationTranslations.ts` | Add translation mappings for new message formats |
| `src/locales/ka.ts` | Add Georgian translations for sender-based messages |
| `src/locales/en.ts` | Add English translations for sender-based messages |

---

## Expected Results

After implementation:

| Notification Type | Before | After |
|-------------------|--------|-------|
| `friend_request` | ❌ Not created at all | ✅ "beka გთხოვს მეგობრობას!" |
| `game_started` | "თამაში დაიწყო შენს ოთახში!" | "beka დაიწყო თამაში: გართობის კუბი!" |
| `room_invite` | "beka გიწვევს თამაშში!" (already good) | Same (no change needed) |

Each notification will show:
1. Sender's avatar
2. Sender's nickname
3. Contextual details (room name, etc.)

