
# Plan: Fix Friend Request Notifications System

## Issues to Fix

1. **Auto-select correct tab when opening notifications** - Panel should open to the tab containing the notification type the user clicked on
2. **Show success feedback after accepting/declining friend requests** - Currently showing duplicate toasts, need to consolidate 
3. **Sender sees new friend instantly without refresh** - Fix realtime subscription filter issue

---

## Technical Changes

### 1. Add Default Tab Support to NotificationsPanel

**File: `src/components/home/NotificationsPanel.tsx`**

Add a `defaultTab` prop that allows parent components to specify which tab to show initially:

```typescript
interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'games' | 'social' | 'trivia';
}
```

Add logic to auto-detect the most relevant tab when none is specified:
- If there are unread social notifications (friend requests), default to 'social'
- Otherwise use 'games' as default

Reset to the determined default tab when panel opens.

### 2. Remove Duplicate Toast in useFriends

**File: `src/hooks/useFriends.ts`**

The `acceptFriendRequest` function shows its own toast ("მეგობარი დაემატა!"), but the `handleAcceptFriend` in NotificationsPanel also shows a toast. Remove the toast from `useFriends.ts` since the caller should control feedback:

```typescript
// Line 341 - Remove this toast
toast.success("მეგობარი დაემატა!");
```

### 3. Fix Realtime Subscription for Sender Updates

**File: `src/hooks/useFriends.ts`**

The current subscription setup has a potential issue - the UPDATE event filter only matches `user_id=eq.${user.id}`, but we need to also catch when the friendship status is updated for rows where the user is either the sender OR recipient.

Add subscription for UPDATE events on both sides:

```typescript
// Also subscribe to updates where user is friend_id 
// (for when recipient accepts/declines your request)
.on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "friendships",
    filter: `friend_id=eq.${user.id}`,
  },
  () => fetchFriends()
)
```

Wait - looking more carefully, line 174-183 already has a wildcard listener (`event: "*"`) for `friend_id=eq.${user.id}`. The issue is that:
- User B sends to User A: `user_id=B, friend_id=A`
- User A accepts: Updates that row
- User B needs to get notified of the update

The wildcard `*` on `friend_id=eq.${user.id}` wouldn't catch this because User B is the `user_id`, not `friend_id`.

**Fix**: Add explicit UPDATE listener for when user is the sender:

Currently the UPDATE listener on `user_id=eq.${user.id}` (lines 148-172) DOES call `fetchFriends()`. But the filter might not be working due to RLS or channel issues.

**Alternative approach**: Use a single broader subscription without filters, then handle all changes:

```typescript
const channel = supabase
  .channel(`friendships-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "friendships",
    },
    async (payload) => {
      const row = (payload.new || payload.old) as any;
      // Only process if user is involved
      if (row?.user_id === user.id || row?.friend_id === user.id) {
        // Handle notifications...
        fetchFriends();
      }
    }
  )
  .subscribe();
```

### 4. Update HeaderActions and TeamV2 to Pass Default Tab

**Files: `src/components/shared/HeaderActions.tsx`, `src/pages/TeamV2.tsx`**

When opening the notifications panel, determine the most relevant tab based on unread notifications and pass it as `defaultTab`.

---

## Implementation Summary

| File | Change |
|------|--------|
| `NotificationsPanel.tsx` | Add `defaultTab` prop, auto-detect best tab based on unread notifications |
| `useFriends.ts` | Remove duplicate toast, simplify realtime subscription with unique channel IDs |
| `HeaderActions.tsx` | Pass unread counts to determine default tab |
| `TeamV2.tsx` | Same as above |

## Result

After these changes:
- Opening notifications will auto-select the tab with unread items (e.g., Social tab for friend requests)
- Accept/decline will show a single clear success message
- Friend request sender will see the new friend appear immediately without page refresh
