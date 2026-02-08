

## Fix Stale Avatars on Room Cards + Delete Two Accounts

### Problem 1: Old Avatars on Room Cards

The room cards in "ჩემი ტრივია" show stale avatars because `useMyRooms.ts` reads `avatar_url` directly from the `room_participants` table (line 154), which stores a **snapshot** of the avatar at the time the user joined the room. When a user updates their avatar in their profile, this snapshot is not updated, so the room cards keep showing the old avatar.

In contrast, the room lobby (`useRoomParticipants.ts`) correctly fetches fresh avatars from the `profiles` table -- but the room cards listing does not.

### Fix

**File: `src/hooks/useMyRooms.ts`** (around lines 150-228)

After fetching all participants from `room_participants`, add a second query to fetch fresh `avatar_url` from the `profiles` table for all participant user IDs, then merge the fresh avatars into the participant data (same pattern used in `useRoomParticipants.ts`).

```
// After fetching allParticipants from room_participants:
// Fetch fresh avatar URLs from profiles
const { data: freshProfiles } = await supabase
  .from("profiles")
  .select("user_id, avatar_url")
  .in("user_id", allParticipantUserIds);

const profileAvatarMap = new Map(freshProfiles?.map(p => [p.user_id, p.avatar_url]) || []);

// Then when building participant data, use:
avatar_url: profileAvatarMap.get(p.user_id) || p.avatar_url
```

This ensures room cards always display the latest avatar from profiles, falling back to the stored snapshot only if the profile lookup fails.

### Problem 2: Delete Two Accounts

Delete these two accounts and all their associated data:

| Nickname | User ID |
|----------|---------|
| Mako | `79fa0a90-eef4-444b-b8e4-4e29490d6613` |
| hhjjh | `62cdca87-5781-4ce1-b9e5-b5f54800357c` |

This will be done via a database migration that deletes their data from all related tables (same order as the `delete-user-account` edge function) and then removes their auth accounts using `auth.users`.

### Summary of Changes

| Item | File/Action |
|------|-------------|
| Fresh avatars on room cards | Edit `src/hooks/useMyRooms.ts` -- add profiles query and merge fresh avatar URLs |
| Delete Mako + hhjjh accounts | Database migration to delete all user data across all tables and auth |

