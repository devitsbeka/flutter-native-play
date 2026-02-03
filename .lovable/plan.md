

# Plan: Navigate to Lobby After Adding to Queue from Results Screen

## Problem Summary

When the host clicks "+ რიგში დამატება" (Add to Queue) in the CategoryPickerModal opened from the results screen, the modal closes but the user stays on the results page. The user wants to go directly to the lobby where they can:
1. See the queue with all items
2. Drag and drop to reorder items

## Current Flow
```text
Results Screen
    ↓ Click "კატეგორიის დამატება"
CategoryPickerModal opens
    ↓ Select category
    ↓ Click "+ რიგში დამატება"
    → Item added to queue
    → Modal closes
    → Stays on Results Screen ❌
```

## Desired Flow
```text
Results Screen
    ↓ Click "კატეგორიის დამატება"
CategoryPickerModal opens
    ↓ Select category
    ↓ Click "+ რიგში დამატება"
    → Item added to queue
    → Modal closes
    → Navigate to Lobby with queue visible ✅
    → Host can drag-reorder queue items
```

## Solution

Modify `GameResultsScreenV2.tsx` to:
1. Update `handleAddToQueue` to call `continueInRoom()` after adding the item to the queue
2. This will transition the user from the results screen to the lobby
3. The lobby's `CategoryPickerSection` already supports drag-and-drop reordering via `Reorder.Group`

## Technical Changes

### File: `src/components/team/GameResultsScreenV2.tsx`

**Change location**: Lines 312-320 (`handleAddToQueue` function)

**Current code**:
```tsx
const handleAddToQueue = (item: {
  source_type: "category" | "random" | "user_trivia";
  category_id?: string | null;
  category_name?: string | null;
  user_trivia_id?: string | null;
  icon_slug?: string | null;
}) => {
  addToQueue(item);
};
```

**Updated code**:
```tsx
const handleAddToQueue = async (item: {
  source_type: "category" | "random" | "user_trivia";
  category_id?: string | null;
  category_name?: string | null;
  user_trivia_id?: string | null;
  icon_slug?: string | null;
}) => {
  // Add item to queue first
  await addToQueue(item);
  
  // Navigate to lobby so host can see and reorder the queue
  continueInRoom();
};
```

## What Already Works

1. **Lobby queue display**: The `CategoryPickerSection` component already shows all queue items
2. **Drag-and-drop**: The `Reorder.Group` from framer-motion is already implemented for host users
3. **Queue persistence**: Items are stored in `room_category_queue` table with realtime subscriptions
4. **`continueInRoom`**: This function already properly resets room status to "waiting" and transitions to lobby phase

## Testing Checklist

After implementation, verify:
1. Host clicks "კატეგორიის დამატება" on results screen → CategoryPickerModal opens
2. Host selects a category and clicks "+ რიგში დამატება"
3. Item is added to queue → User is navigated to lobby
4. Lobby shows the queue with all items visible
5. Host can drag queue items to reorder them
6. "არჩევა" (Select Now) button still works as before (starts game immediately, doesn't navigate)

