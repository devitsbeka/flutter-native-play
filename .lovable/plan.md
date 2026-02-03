

# Plan: Fix "Add to Queue" Flow to Show Picked Category in Lobby

## Problem Summary

When clicking "რიგში დამატება" (Add to Queue) from the results screen:
1. The picked category is added to the queue table
2. User returns to lobby
3. **But the lobby shows empty state** ("რისი თამაში გინდა?") instead of showing the picked category
4. Adding more items should show them as round 2, 3, etc.

## Root Cause

Two issues combine to cause this:

### Issue 1: Room Category Not Updated
When adding to queue, the item goes to `room_category_queue` table but the room's `category_name`/`category_id`/`user_trivia_id` fields remain from the last played game.

### Issue 2: Lobby Hides Data After Results
In `RoomLobbyV2.tsx` (lines 860-880), when `justReturnedFromResults && !madeNewSelection` is true:
- `categoryName` is forced to `null`
- `queue` is forced to `[]`

This logic was intended to show empty state when queue is empty, but it incorrectly hides data when queue has items.

## Solution

### Change 1: Set First Queued Item as Current Round

When adding to queue from results screen, **also update the room's category data** with the item being added. This way, when returning to lobby, the first item displays as "round 1".

**File**: `src/components/team/GameResultsScreenV2.tsx`

Update `handleAddToQueue` to also set the room's current category:

```typescript
const handleAddToQueue = async (item: {
  source_type: "category" | "random" | "user_trivia";
  category_id?: string | null;
  category_name?: string | null;
  user_trivia_id?: string | null;
  icon_slug?: string | null;
}) => {
  if (!currentRoom) return;
  
  // Add item to queue first
  await addToQueue(item);
  
  // ALSO update the room's current category so lobby shows it as round 1
  await supabase
    .from("game_rooms")
    .update({
      category_id: item.source_type === "category" ? item.category_id : null,
      category_name: item.category_name || (item.source_type === "random" ? "შემთხვევითი" : null),
      user_trivia_id: item.source_type === "user_trivia" ? item.user_trivia_id : null,
    })
    .eq("id", currentRoom.id);
  
  // Navigate to lobby so host can see and reorder the queue
  continueInRoom();
};
```

### Change 2: Don't Hide Queue When Items Exist

Update the lobby's CategoryPickerSection props to show queue items even after returning from results.

**File**: `src/components/team/RoomLobbyV2.tsx`

Lines 856-880 - Change the queue prop to show items when queue has content:

```typescript
<CategoryPickerSection
  categoryName={
    // Show category if: user made new selection OR queue has items
    (justReturnedFromResults && !madeNewSelection && queue.length === 0) ? null : (
      currentRoom.category_name ?? null
    )
  }
  categoryId={
    (justReturnedFromResults && !madeNewSelection && queue.length === 0) ? null : 
    currentRoom.category_id
  }
  iconSlug={/* same logic with queue.length === 0 check */}
  isHost={isHost}
  queue={queue}  // Always show queue - remove conditional hiding
  // ... rest unchanged
/>
```

### Change 3: Update continueInRoom to Keep Category When Queue Has Items

The current `continueInRoom` already handles this correctly (keeps category data when queue has items), but we need to ensure the local state is also updated.

**File**: `src/contexts/MultiplayerContextV2.tsx`

Modify `continueInRoom` (around line 1360) to NOT reset `justReturnedFromResults` flag when queue has items - this allows proper display:

```typescript
setState(prev => ({
  ...prev,
  phase: "lobby",
  questions: [],
  currentQuestionIndex: 0,
  myScore: 0,
  lastQuestionResult: null,
  opponentAnswers: {},
  lastPlayedTriviaId: justPlayedTriviaId || null,
  justReturnedFromResults: !hasQueueItems, // Only set if queue is empty
  // ... rest
}));
```

## Expected Result After Fix

1. Host completes a round
2. Opens category picker → selects "გეოგრაფია" → clicks "რიგში დამატება"
3. Returns to lobby showing:
   - Main section: "გეოგრაფია" (მიმდინარე კატეგორია)
   - Queue row shows: `[1] გეოგრაფია`
4. Opens picker again → selects "ისტორია" → clicks "რიგში დამატება"
5. Lobby now shows:
   - Main section: "გეოგრაფია"
   - Queue row: `[1] გეოგრაფია` `[2] ისტორია` (draggable)
6. Host can drag to reorder

## Files to Modify

| File | Change |
|------|--------|
| `src/components/team/GameResultsScreenV2.tsx` | Update room category when adding to queue |
| `src/components/team/RoomLobbyV2.tsx` | Show queue/category data when queue has items |
| `src/contexts/MultiplayerContextV2.tsx` | Set `justReturnedFromResults` based on queue state |

## Technical Notes

- The queue is stored in `room_category_queue` table with positions
- The "current round" (shown as pill #1) comes from room's `category_name` field
- Queue items (pills #2+) come from the hook's queue array
- Position 1 in queue display = room category; positions 2+ = queue items

