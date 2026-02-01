
# Show Unread Badges on Notification Tabs

## Overview
Change the notification panel behavior so that unread badges remain visible on tabs when the panel opens. Currently, all notifications are marked as read immediately when opening the panel, which prevents users from seeing which category (Games/Social/Trivia) has new notifications.

## Current Behavior
- When panel opens → `markAllAsRead()` is called immediately
- All unread badges disappear instantly
- User cannot tell which tab has new content

## Desired Behavior
- When panel opens → Show unread counts on each tab
- When user switches to a tab → Mark only those notifications as read
- User can see "მეგობრები has 2 new" vs "ტრივია has 5 new" etc.

## Technical Changes

### File: `src/components/home/NotificationsPanel.tsx`

**1. Remove immediate `markAllAsRead()` on panel open**

Remove lines 65-70:
```typescript
// ❌ REMOVE this useEffect
useEffect(() => {
  if (isOpen && unreadCount > 0 && !loading) {
    markAllAsRead();
  }
}, [isOpen, unreadCount, loading, markAllAsRead]);
```

**2. Add new function to mark only current tab's notifications as read**

```typescript
// ✅ ADD new function
const markTabAsRead = useCallback(async (tab: 'games' | 'social' | 'trivia') => {
  const unreadInTab = notifications.filter(n => 
    TAB_TYPES[tab].includes(n.type) && !n.read_at
  );
  
  // Mark each unread notification in this tab as read
  for (const notification of unreadInTab) {
    await markAsRead(notification.id);
  }
}, [notifications, markAsRead]);
```

**3. Call `markTabAsRead` when tab changes**

Add useEffect to mark current tab's notifications as read when tab is switched:
```typescript
// ✅ ADD - Mark notifications as read when switching to a tab
useEffect(() => {
  if (isOpen && !loading) {
    // Small delay to let user see the badge before it disappears
    const timer = setTimeout(() => {
      markTabAsRead(activeTab);
    }, 500);
    return () => clearTimeout(timer);
  }
}, [isOpen, activeTab, loading, markTabAsRead]);
```

---

### File: `src/pages/Notifications.tsx`

Apply the same pattern to the full notifications page:

**1. Remove immediate `markAllAsRead()` on page load (lines 67-74)**

**2. Add `markTabAsRead` function (same as panel)**

**3. Add useEffect to mark current tab as read when switching**

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/home/NotificationsPanel.tsx` | Remove auto `markAllAsRead`, add per-tab read marking |
| `src/pages/Notifications.tsx` | Same changes for consistency |

## Visual Result

```text
Opening panel with unread notifications:

╭─────────────────────────────────────╮
│  🔔 აქტივობა                    ✕  │
├─────────────────────────────────────┤
│  თამაშები   მეგობრები(2)  ტრივია(3) │
│  [active]   [badge]       [badge]   │
├─────────────────────────────────────┤
│  (shows თამაშები notifications)     │
│  ...                                │
╰─────────────────────────────────────╯

After switching to მეგობრები tab:
- მეგობრები badge (2) disappears after 0.5s
- User can see which notifications are new
- Other tabs keep their badges until visited
```

---

## Testing
- Open notification panel with unread notifications
- Verify badges show on tabs
- Switch to a tab and verify badge clears after short delay
- Verify notifications are properly marked as read in database
- Test on both panel and full notifications page
