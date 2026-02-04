
# Plan: Fix Race Condition When Adding Category to Queue

## Problem Summary

When the host clicks "რიგში დამატება" (Add to Queue) on the results screen, other players briefly see the previous game. This happens because:

1. Host updates `game_rooms` with new category info
2. Non-host subscription receives the update while status is still "playing"
3. Non-host incorrectly tries to load questions from the old game
4. Then `continueInRoom()` resets status to "waiting" (too late)

## Root Cause

In `GameResultsScreenV2.tsx`, the `handleAddToQueue` function updates the room's category data **before** calling `continueInRoom()`:

```text
Step 1: await addToQueue(item)
Step 2: await supabase.update({ category_id, category_name... })  ← Non-host sees this!
Step 3: continueInRoom()  ← Status reset happens here, too late!
```

The non-host's realtime subscription detects the UPDATE and sees `status: "playing"` with the old `current_game_id`, triggering an unwanted fetch.

## Solution

**Option: Reset status to "waiting" FIRST, then update category data**

Change the order of operations in `handleAddToQueue`:

1. Call `continueInRoom()` FIRST to reset status to "waiting"
2. Wait for the status update to complete
3. THEN update the category/trivia fields

This ensures non-hosts see the status change to "waiting" before any category updates.

## Technical Changes

### File: `src/components/team/GameResultsScreenV2.tsx`

Update `handleAddToQueue` function:

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
  
  // CRITICAL FIX: Reset room status to "waiting" FIRST
  // This prevents non-hosts from seeing the room update with status="playing"
  // and incorrectly trying to load old game questions
  await supabase
    .from("game_rooms")
    .update({
      status: "waiting",
      category_id: item.source_type === "category" ? item.category_id : null,
      category_name: item.category_name || (item.source_type === "random" ? "შემთხვევითი" : null),
      user_trivia_id: item.source_type === "user_trivia" ? item.user_trivia_id : null,
    })
    .eq("id", currentRoom.id);
  
  // Navigate to lobby (already sets local state correctly)
  // Since we already updated status, pass a flag or simplify continueInRoom's update
  setState(prev => ({
    ...prev,
    phase: "lobby",
    questions: [],
    currentQuestionIndex: 0,
    myScore: 0,
    lastQuestionResult: null,
    opponentAnswers: {},
  }));
};
```

Wait, this approach has a problem: `continueInRoom` is from context and the component doesn't have direct access to `setState`.

### Better Solution: Combine the DB update into a single atomic operation

Move ALL the room updates (status + category) into ONE database call:

**File: `src/components/team/GameResultsScreenV2.tsx`**

```typescript
const handleAddToQueue = async (item: {...}) => {
  if (!currentRoom) return;
  
  // Add item to queue first
  await addToQueue(item);
  
  // COMBINED UPDATE: Reset status AND set category in ONE operation
  // This prevents race condition where non-host sees status="playing" with new category
  await supabase
    .from("game_rooms")
    .update({
      status: "waiting",  // ← Include status reset
      category_id: item.source_type === "category" ? item.category_id : null,
      category_name: item.category_name || (item.source_type === "random" ? "შემთხვევითი" : null),
      user_trivia_id: item.source_type === "user_trivia" ? item.user_trivia_id : null,
    })
    .eq("id", currentRoom.id);
  
  // Navigate to lobby (continueInRoom will see status is already "waiting")
  continueInRoom();
};
```

**AND update `continueInRoom` in `MultiplayerContextV2.tsx`** to handle the case where status is already "waiting":

```typescript
const continueInRoom = useCallback(async () => {
  if (!state.currentRoom) return;
  
  const roomId = state.currentRoom.id;
  const justPlayedTriviaId = state.currentRoom.user_trivia_id;
  
  const { data: queueItems } = await supabase
    .from("room_category_queue")
    .select("id")
    .eq("room_id", roomId)
    .limit(1);
  
  const hasQueueItems = queueItems && queueItems.length > 0;
  
  // Check current room status - if already "waiting", skip the DB update
  const { data: currentRoomState } = await supabase
    .from("game_rooms")
    .select("status")
    .eq("id", roomId)
    .single();
  
  // Only update DB if not already in waiting state
  if (currentRoomState?.status !== "waiting") {
    await supabase
      .from("game_rooms")
      .update({ 
        status: "waiting",
        ...(hasQueueItems ? {} : {
          category_id: null,
          category_name: null,
          user_trivia_id: null,
        }),
      })
      .eq("id", roomId);
  }
  
  // Update local state regardless
  setState(prev => ({
    ...prev,
    phase: "lobby",
    questions: [],
    currentQuestionIndex: 0,
    myScore: 0,
    lastQuestionResult: null,
    opponentAnswers: {},
    lastPlayedTriviaId: justPlayedTriviaId || null,
    justReturnedFromResults: !hasQueueItems,
    ...(hasQueueItems ? {} : {
      currentRoom: prev.currentRoom ? {
        ...prev.currentRoom,
        category_id: null,
        category_name: null,
        user_trivia_id: null,
      } : null,
    }),
  }));
}, [state.currentRoom]);
```

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/team/GameResultsScreenV2.tsx` | Combine status reset + category update into single DB operation in `handleAddToQueue` |
| `src/contexts/MultiplayerContextV2.tsx` | Make `continueInRoom` idempotent (skip DB update if already in "waiting" status) |

## Expected Behavior After Fix

1. Host clicks "რიგში დამატება"
2. Queue item is added
3. **Single atomic DB update**: `status: "waiting"` + new category data
4. Non-host receives ONE update event with `status: "waiting"`
5. Non-host sees `status === "waiting"` → transitions to lobby (correct behavior)
6. `continueInRoom()` sets host's local state to lobby
7. No flash of previous game on any screen
