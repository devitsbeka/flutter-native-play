
# Plan: Make Notification Cards Clickable and Improve Trivia Notifications

## Summary

Enable click-to-navigate functionality on all notification cards and adjust the behavior for `trivia_played` notifications (when someone plays your trivia).

---

## Current Behavior

| Issue | Description |
|-------|-------------|
| Cards not fully clickable | Notifications with single action buttons only navigate when clicking the button itself |
| "ითამაშე" button on `trivia_played` | Shows play button, but this is **your** trivia - you don't want to play it again, just view stats |

---

## Solution

### 1. Make Entire Notification Card Clickable

Currently, the card's `handleClick` function only navigates when there are no actions:

```typescript
const handleClick = () => {
  if (!hasDualActions && !hasSingleAction) {  // ← Only navigates if NO buttons
    if (isUnread) onMarkRead(notification.id);
    onNavigate(notification);
  }
};
```

**Change:** Allow the card to be clickable even when it has a single action button. The card AND the button will both navigate.

### 2. Remove "ითამაშე" Button for `trivia_played`

For `trivia_played` notifications:
- The trivia owner sees "Someone played your trivia"
- They should click the card to view their trivia's leaderboard/stats
- No need for a "Play" button - they created this trivia!

**Change:** Remove `isTriviaPlayed` from the `hasSingleAction` condition. This makes the card behave like a regular clickable notification without a button.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/notifications/CompactNotificationCard.tsx` | Remove `isTriviaPlayed` from `hasSingleAction`, update `handleClick` logic |

---

## Technical Implementation

### Change 1: Update `hasSingleAction` (Line 75)

**Before:**
```typescript
const hasSingleAction = (isRoomInvite || isGameStarted || isGameResult || isTriviaLikedOrSaved || isTriviaPlayed) && !hasDualActions;
```

**After:**
```typescript
const hasSingleAction = (isRoomInvite || isGameStarted || isGameResult || isTriviaLikedOrSaved) && !hasDualActions;
```

This removes the "ითამაშე" button from `trivia_played` notifications.

### Change 2: Update `handleClick` (Lines 231-236)

**Before:**
```typescript
const handleClick = () => {
  if (!hasDualActions && !hasSingleAction) {
    if (isUnread) onMarkRead(notification.id);
    onNavigate(notification);
  }
};
```

**After:**
```typescript
const handleClick = () => {
  // Allow card click for all notifications except those with dual actions (accept/decline)
  if (!hasDualActions) {
    if (isUnread) onMarkRead(notification.id);
    onNavigate(notification);
  }
};
```

This makes cards clickable even when they have a single action button.

### Change 3: Update cursor styling (Line 280)

**Before:**
```typescript
!hasDualActions && !hasSingleAction && "cursor-pointer active:bg-foreground/5"
```

**After:**
```typescript
!hasDualActions && "cursor-pointer active:bg-foreground/5"
```

---

## Behavior After Changes

| Notification Type | Card Clickable | Button Shown | Destination |
|------------------|----------------|--------------|-------------|
| `friend_request` | No | Accept/Decline | N/A |
| `challenge` | No | Accept/Decline | N/A |
| `room_invite` | Yes | "ითამაშე" | Room join |
| `game_started` | Yes | "ითამაშე" | Room |
| `game_result` | Yes | "ნახვა" | Room/Profile |
| `trivia_liked` | Yes | "ნახვა" | Trivia lobby |
| `trivia_saved` | Yes | "ნახვა" | Trivia lobby |
| `trivia_played` | Yes | **None** | Trivia lobby |
| Others | Yes | None | Varies |

---

## Visual Result

**Before (`trivia_played`):**
```text
┌─────────────────────────────────────┐
│ 🎮 TriviaMaste ითამაშა შენი ტრივია │
│     გემრიელი ქართული სამზარეულო    │
│                                     │
│     ┌───────────┐                   │
│     │ ითამაშე   │  ← Button shown  │
│     └───────────┘                   │
└─────────────────────────────────────┘
```

**After (`trivia_played`):**
```text
┌─────────────────────────────────────┐
│ 🎮 TriviaMaste ითამაშა შენი ტრივია │ ← Entire card clickable
│     გემრიელი ქართული სამზარეულო    │
│                                     │ ← No button, cleaner look
└─────────────────────────────────────┘
```

---

## Summary of Changes

1. Remove `isTriviaPlayed` from `hasSingleAction` condition
2. Allow card click navigation for all non-dual-action notifications
3. Update cursor styling to reflect clickability
