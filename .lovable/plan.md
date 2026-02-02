
# Fix LIVE Room Priority, Instant Notification Updates, and Purple Background Persistence

## Overview
This plan addresses three related UX issues:
1. **LIVE rooms not appearing first** - Rooms with players currently inside should appear at the top
2. **Notification bell not updating instantly** - The badge should update immediately when new notifications arrive regardless of which page the user is on
3. **Purple unread background disappearing too soon** - The purple highlight should persist until the panel is closed

---

## Issue 1: LIVE Rooms Should Appear First

### Current Behavior
The room sorting logic in `useMyRooms.ts` (lines 423-462) prioritizes:
1. Active TV sessions (HIGHEST)
2. Newly created host rooms (within 5 min)
3. LIVE rooms (playing OR others online)
4. Unread activity
5. Waiting vs completed

### Problem
Looking at the screenshot, the room "ჯავშან ტყე" with LIVE badge appears SECOND after "შოუს სცენა" (which shows "მოლოდინი" / pending).

The issue: `has_others_online` is based on `user_presence` checking if participants are online in the **app**, not specifically **in the room**. The `has_players_in_room` field (lines 47-53 in useMyRooms interface) tracks if players are actually **inside** the room (via current_page = /room/ID), but the sorting logic uses `has_others_online` instead.

### Fix
Update the sorting logic to use `has_players_in_room` instead of `has_others_online` for LIVE priority:

**File: `src/hooks/useMyRooms.ts`**

```text
Line 444-448 - Change:
// Priority 2: LIVE rooms (playing or others online)
const aIsLive = a.status === "playing" || a.has_others_online;
const bIsLive = b.status === "playing" || b.has_others_online;

To:
// Priority 2: LIVE rooms (players actually IN the room, more accurate than just online)
const aIsLive = a.has_players_in_room || (a.status === "playing" && a.has_others_online);
const bIsLive = b.has_players_in_room || (b.status === "playing" && b.has_others_online);
```

This ensures rooms where players are **actually inside** (current_page matches room) get priority.

---

## Issue 2: Notification Bell Not Updating Instantly

### Current Behavior
The `useNotifications` hook (lines 69-124) subscribes to realtime updates on the `notifications` table and should update `unreadCount` immediately when new notifications arrive.

### Problem
The realtime subscription is set up correctly, but the hook might not be mounted on all pages or there could be a channel conflict. Looking at the code:
- `Index.tsx` (line 60) imports `useNotifications`
- `HeaderActions.tsx` (line 17) also uses `useNotifications`

Since these are separate hook instances, they should each have their own subscription. However, if a notification arrives while on a different page that doesn't use this hook, the subscription won't be active.

### Root Cause Analysis
The realtime works but only updates when the hook is mounted. The hook IS used in:
- `Index.tsx` (home page)
- `HeaderActions.tsx` (used on other pages)

Looking more closely at the screenshot - the user is on the home page and sees no badge. This suggests the subscription might have a conflict or not be triggering the state update.

### Fix
The issue is likely that both `Index.tsx` and `HeaderActions.tsx` create separate `useNotifications` instances with the same channel name `'notifications-realtime'`. When the second component mounts, it might override or conflict with the first subscription.

**File: `src/hooks/useNotifications.ts`**

Change line 75 to use a unique channel name per instance:

```text
Line 75 - Change:
const channel = supabase
  .channel('notifications-realtime')

To:
// Use unique channel name to avoid conflicts when hook is used in multiple components
const channelId = `notifications-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
const channel = supabase
  .channel(channelId)
```

This ensures each hook instance has its own channel subscription without conflicts.

---

## Issue 3: Purple Unread Background Disappearing Too Soon

### Current Behavior
In `NotificationsPanel.tsx` (lines 78-85), there's a `useEffect` that marks all notifications in the current tab as read after 500ms:

```tsx
useEffect(() => {
  if (isOpen && !loading) {
    const timer = setTimeout(() => {
      markTabAsRead(activeTab);
    }, 500);
    return () => clearTimeout(timer);
  }
}, [isOpen, activeTab, loading, markTabAsRead]);
```

### Problem
This causes the purple `bg-purple-500/10` background (controlled by `isUnread` which checks `read_at`) to disappear within 500ms of viewing the notification panel. The user wants the purple to persist as a visual indicator until they EXIT the panel.

### Fix
Only mark notifications as read when the panel is **closed**, not while viewing:

**File: `src/components/home/NotificationsPanel.tsx`**

1. Remove the auto-mark-as-read effect (lines 78-85)

2. Add new effect that marks as read ONLY when panel closes:

```tsx
// Mark current tab's notifications as read when panel closes
useEffect(() => {
  // When panel was open and is now closing, mark current tab as read
  return () => {
    if (isOpen) {
      markTabAsRead(activeTab);
    }
  };
}, []); // Empty deps - cleanup only runs on unmount

// Actually, better approach - track previous isOpen state:
const prevIsOpenRef = useRef(isOpen);
useEffect(() => {
  // Mark as read when panel closes (transitions from open to closed)
  if (prevIsOpenRef.current && !isOpen) {
    // Panel just closed - mark current tab as read
    markTabAsRead(activeTab);
  }
  prevIsOpenRef.current = isOpen;
}, [isOpen, activeTab, markTabAsRead]);
```

This way:
- While panel is open: notifications retain purple background (unread)
- When user closes panel: notifications get marked as read
- Next time panel opens: those notifications will have neutral background

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useMyRooms.ts` | Update LIVE room sorting to prioritize `has_players_in_room` (lines 444-448) |
| `src/hooks/useNotifications.ts` | Use unique channel name per hook instance to prevent conflicts (line 75) |
| `src/components/home/NotificationsPanel.tsx` | Mark notifications as read on panel close instead of while viewing (lines 78-85) |

---

## Technical Details

### Room Sorting Priority (Updated)
1. Active TV sessions (top priority)
2. Newly created host rooms (within 5 min) - "ახალი" badge
3. **LIVE rooms (players actually IN room)** - uses `has_players_in_room`
4. Playing rooms with others online
5. Rooms with unread activity
6. Waiting rooms
7. Completed rooms
8. By last activity timestamp

### Notification Read State Flow (Updated)
1. User opens notification panel
2. Purple background visible on unread items
3. User can navigate between tabs - purple persists
4. User closes panel
5. Viewed tab's notifications marked as read
6. Next open: those items have neutral background

---

## Files to Modify

- `src/hooks/useMyRooms.ts` - Fix LIVE room sorting priority
- `src/hooks/useNotifications.ts` - Fix realtime subscription conflicts
- `src/components/home/NotificationsPanel.tsx` - Fix purple background persistence
