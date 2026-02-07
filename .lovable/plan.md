

## Fix: Queue Rounds Lost After First Game + Show "გაგრძელება" Button

### Problem 1: Queue rounds disappear after first game
When the user adds rounds to the queue in the lobby and then picks a "current" category to play, the `handleSelectCategory`, `handleSelectRandom`, and `handleSelectTrivia` functions in `RoomLobbyV2.tsx` **delete the entire queue** with:
```
await supabase.from("room_category_queue").delete().eq("room_id", currentRoom.id);
```
This was added as "CRITICAL: Clear stale queue items to prevent them from overriding this selection" -- but it wipes out all carefully queued rounds.

After the game ends, the queue is empty, so the results screen shows 0 rounds remaining.

### Problem 2: "გაგრძელება" button not showing
Because the queue is already empty by the time the results screen loads, `queue.length > 0` is false, so the Continue button never appears. Instead, "კატეგორიის დამატება" (Add Category) and "ოთახში დაბრუნება" (Back to Room) are shown.

### Solution

**File: `src/components/team/RoomLobbyV2.tsx`** -- Stop wiping the queue on category selection

In all three handlers (`handleSelectCategory`, `handleSelectRandom`, `handleSelectTrivia`), remove the line that deletes the entire queue:
```
await supabase.from("room_category_queue").delete().eq("room_id", currentRoom.id);
```

The `consumeMatchingQueueItem` function in `MultiplayerContextV2.tsx` already handles the correct behavior: it checks if the first queue item matches what was just played, and only removes that single matching item. This is sufficient to prevent duplicates without destroying the whole queue.

### Changes

**`src/components/team/RoomLobbyV2.tsx`** (3 removals):

1. **Line 450-451** in `handleSelectCategory`: Remove the queue-clearing line
2. **Line 485-486** in `handleSelectRandom`: Remove the queue-clearing line  
3. **Line 534-535** in `handleSelectTrivia`: Remove the queue-clearing line

### Why This Is Safe

- `consumeMatchingQueueItem` (called in `startGame`) already handles deduplication: if the first queue item matches the category being played, it removes just that one item and reorders the rest.
- `startNextFromQueue` (called from results screen) independently pops the first item from the queue and starts the next round.
- Queue items are room-specific and will be naturally cleaned up when rooms are deleted.

### No Other Changes Needed

The results screen (`GameResultsScreenV2.tsx`) logic is already correct:
- It shows "გაგრძელება" when `queue.length > 0`
- It hides "ოთახში დაბრუნება" when queue exists  
- The back button in the header provides navigation at all times

The context functions (`startNextFromQueue`, `continueInRoom`) correctly handle queue presence/absence.

