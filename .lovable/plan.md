
# Fix: Trivia Notifications Action Buttons

## Problem

All trivia notification types (`trivia_liked`, `trivia_saved`, `trivia_played`) show the green "ითამაშე" (Play) button. However:

- **`trivia_liked`** - Someone liked your trivia → Should show "ნახვა" (View) and navigate to view the trivia
- **`trivia_saved`** - Someone saved your trivia → Should show "ნახვა" (View) and navigate to view the trivia  
- **`trivia_played`** - Someone played your trivia → Can keep "ითამაშე" (Play) button since playing makes sense

## Solution

Differentiate between trivia notification types:
1. `trivia_liked` and `trivia_saved` → Show "ნახვა" button (neutral style), navigate to trivia preview page
2. `trivia_played` → Keep "ითამაშე" button (green play style)

---

## Implementation

### File 1: `src/components/notifications/CompactNotificationCard.tsx`

**Changes:**

1. Split `isTriviaAction` into separate checks:
```typescript
const isTriviaLikedOrSaved = ['trivia_liked', 'trivia_saved'].includes(notification.type);
const isTriviaPlayed = notification.type === 'trivia_played';
```

2. Update `hasSingleAction` to include the new variables:
```typescript
const hasSingleAction = (isRoomInvite || isGameStarted || isGameResult || isTriviaLikedOrSaved || isTriviaPlayed) && !hasDualActions;
```

3. Update `getActionButtonLabel()`:
```typescript
const getActionButtonLabel = () => {
  if (isRoomInvite || isGameStarted || isTriviaPlayed) return 'ითამაშე';
  if (isGameResult || isTriviaLikedOrSaved) return 'ნახვა';
  return 'გახსნა';
};
```

4. Update `isPlayButton` to exclude liked/saved:
```typescript
const isPlayButton = isRoomInvite || isGameStarted || isTriviaPlayed;
```

---

### File 2: `src/pages/Notifications.tsx`

**Changes:**

Update `handleNavigate` to navigate differently for liked/saved vs played:

```typescript
case 'trivia_liked':
case 'trivia_saved':
  // Navigate to view trivia (collection preview) instead of playing
  if (data?.post_id) {
    navigate(`/collection/${data.post_id}`);
  } else {
    navigate('/explore?tab=my-trivia');
  }
  break;
case 'trivia_played':
  // Keep play behavior for "played" notifications
  if (data?.post_id) {
    navigate(`/team?playTrivia=${data.post_id}`);
  } else {
    navigate('/explore?tab=my-trivia');
  }
  break;
```

---

## Result

| Notification Type | Button Text | Button Style | Navigation |
|------------------|-------------|--------------|------------|
| `trivia_liked` | ნახვა | Neutral (border) | `/collection/{post_id}` |
| `trivia_saved` | ნახვა | Neutral (border) | `/collection/{post_id}` |
| `trivia_played` | ითამაშე | Green (play) | `/team?playTrivia={post_id}` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/notifications/CompactNotificationCard.tsx` | Separate trivia types, update button label and style logic |
| `src/pages/Notifications.tsx` | Update navigation for liked/saved to view instead of play |
