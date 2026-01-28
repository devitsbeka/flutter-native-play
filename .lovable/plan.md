

# Plan: Fix Question Sync and Queue Display Issues in Multiplayer Rooms

## Problem Summary

Two bugs reported:
1. **Host and player see DIFFERENT questions** - When playing a geography category, host and player are not seeing the same questions/answers
2. **Played round shows as "next round"** - After finishing a round, the queue preview still shows the round that was just played instead of the actual next round

---

## Bug 1: Different Questions Between Host and Player

### Root Cause Analysis

The issue is a **race condition and caching problem** in the non-host player's question loading:

```text
Current Flow (BROKEN):

┌─────────────────────────────────────────────────────────────────┐
│ HOST calls startNextFromQueue():                                │
│   1. Delete queue item from DB                                  │
│   2. Fetch NEW questions via getQuestions()                     │
│   3. Delete old room_questions                                  │
│   4. Insert NEW questions into room_questions                   │
│   5. Update game_rooms.status = "playing"                       │
│   6. Host's local state updated with new questions              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ NON-HOST receives realtime event:                               │
│   game_rooms.status changed to "playing"                        │
│                                                                 │
│ NON-HOST subscription handler:                                  │
│   1. Fetch from room_questions WHERE room_id = X                │
│                                                                 │
│   PROBLEM: Handler may be using STALE subscription              │
│   - useEffect dependency on state.phase causes re-subscription  │
│   - Old subscription may still be active during transition      │
│   - Query may hit BEFORE new questions are fully committed      │
│   - Player gets OLD questions or misses the event entirely      │
└─────────────────────────────────────────────────────────────────┘
```

The specific issues:
1. **useEffect subscription instability**: Dependencies include `state.phase` which changes during round transitions, causing the subscription to be recreated mid-flow
2. **No retry/validation**: If the player fetches room_questions too early (before new ones are inserted), they get nothing or old data
3. **Promise.all timing**: Questions are inserted in parallel, so they might not all be committed when the status update arrives

### Solution

1. **Remove `state.phase` from subscription dependencies** - The subscription should be stable and not recreate during phase changes
2. **Add delay/retry for question fetch** - Wait briefly after receiving "playing" status to ensure questions are committed
3. **Validate question count** - Ensure we fetched the expected number of questions before transitioning

### Technical Changes

**File: `src/contexts/MultiplayerContextV2.tsx`**

**Change 1: Move subscription setup to a separate stable useEffect**

Instead of having subscription inside an effect that depends on `state.phase`, create a stable subscription that handles all status changes:

```typescript
// Lines 209-327 - Refactor subscription to be stable
useEffect(() => {
  if (!state.currentRoom?.id) return;
  
  const roomId = state.currentRoom.id;
  const currentPhase = phaseRef.current; // Use ref to track phase without recreating subscription
  
  // ...subscription code with stable handler
  
  return () => cleanupChannels();
}, [state.currentRoom?.id, user?.id]); // Remove state.phase from dependencies
```

**Change 2: Add retry logic for question fetch**

When non-host receives "playing" status, add a small delay and retry to ensure questions are committed:

```typescript
if (updated.status === "playing" && !isHost) {
  // Wait briefly for questions to be fully committed
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Fetch with retry
  let attempts = 0;
  let roomQuestions = null;
  
  while (attempts < 3 && (!roomQuestions || roomQuestions.length === 0)) {
    const { data } = await supabase
      .from("room_questions")
      .select("*")
      .eq("room_id", roomId)
      .order("question_index", { ascending: true });
    
    roomQuestions = data;
    
    if (!roomQuestions || roomQuestions.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }
  }
  
  if (roomQuestions && roomQuestions.length > 0) {
    // ... map questions and update state
  }
}
```

**Change 3: Use refs for phase tracking**

```typescript
const phaseRef = useRef(state.phase);
useEffect(() => {
  phaseRef.current = state.phase;
}, [state.phase]);
```

---

## Bug 2: Played Round Shows as "Next Round"

### Root Cause Analysis

The queue display on the results screen shows `queue[0]` as the "next round". The queue item is deleted in `startNextFromQueue()` at the START of the function. However:

1. The `useRoomCategoryQueue` hook fetches queue via realtime subscription
2. The subscription might not have updated yet when results screen renders
3. The results screen might show the OLD queue data (before the deletion was processed)

The flow is:
```text
1. Host clicks "Continue" → startNextFromQueue() called
2. Queue item deleted from DB (line 1104-1107)
3. Realtime event fires → useRoomCategoryQueue fetches new queue
4. BUT: Results screen already rendered with OLD queue data
5. Screen shows the just-played category as "next round"
```

### Solution

1. **Refetch queue when entering results phase** - Force a fresh queue fetch when transitioning to results
2. **Better timing** - The queue deletion happens when starting a NEW round, but we should ensure results screen always shows the UPCOMING rounds, not the current one

Actually, I realize the flow is different. Looking at the code:
- Queue item is deleted when `startNextFromQueue()` is called (when clicking "Continue")
- NOT when entering results screen

So when we're on results screen AFTER playing a round:
- If we played from queue, the queue item WAS consumed (deleted) by `startNextFromQueue()` BEFORE playing
- So the queue should already be correct

BUT if the host added items to queue and then started DIRECTLY (not via startNextFromQueue), the flow might be different.

Let me re-examine: When does `startNextFromQueue` get called?
- Called from `handlePlayAgain` in `GameResultsScreenV2.tsx` when `queue.length > 0`
- So it's called AFTER results, not before

This means: When viewing results after round 1, the queue still contains the item that was just played (because it wasn't consumed yet). The item only gets consumed when clicking "Continue" which calls `startNextFromQueue()`.

### The Real Issue

The queue item should be consumed at the START of the round, not when continuing to the next. Looking at the code flow:

1. User adds "Geography" to queue
2. Host clicks "Start" → This should consume the queue item
3. Players play Geography
4. Results screen shows → Queue should now be empty (or show next item)

But currently:
1. User adds "Geography" to queue  
2. Host clicks "Start" → Calls `startGame()` NOT `startNextFromQueue()`
3. Players play Geography
4. Results screen shows → Queue STILL has "Geography" as first item
5. Preview says "Next round: Geography" → WRONG!

### Solution

When starting a game, if there's a queue item that matches what we're about to play, consume it:

**Option A: Consume queue item when game starts (if it matches)**

In `startGame()`, check if first queue item matches the category being played and delete it.

**Option B: Always use queue for game start**

If queue has items, always use `startNextFromQueue()` logic even for initial game start.

### Technical Changes

**File: `src/contexts/MultiplayerContextV2.tsx`**

**In `startGame()` function - consume matching queue item:**

After starting the game, check if the category just played matches the first queue item and remove it:

```typescript
const startGame = useCallback(async () => {
  // ... existing game start logic ...
  
  // After game starts successfully, consume matching queue item
  const categoryIdPlayed = state.currentRoom?.category_id;
  
  const { data: queueItems } = await supabase
    .from("room_category_queue")
    .select("*")
    .eq("room_id", roomId)
    .order("position", { ascending: true })
    .limit(1);
  
  const firstQueueItem = queueItems?.[0];
  
  // If first queue item matches what we just played, consume it
  if (firstQueueItem) {
    const matchesCategory = firstQueueItem.category_id === categoryIdPlayed;
    const matchesUserTrivia = firstQueueItem.user_trivia_id === state.currentRoom?.user_trivia_id;
    
    if (matchesCategory || matchesUserTrivia) {
      await supabase
        .from("room_category_queue")
        .delete()
        .eq("id", firstQueueItem.id);
      
      // Reorder remaining items
      // ... reorder logic ...
    }
  }
}, [/* deps */]);
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `MultiplayerContextV2.tsx` | Remove `state.phase` from subscription useEffect dependencies |
| `MultiplayerContextV2.tsx` | Add phase tracking via refs |
| `MultiplayerContextV2.tsx` | Add retry logic with delay when non-host fetches questions |
| `MultiplayerContextV2.tsx` | Consume matching queue item when game starts |
| `MultiplayerContextV2.tsx` | Add validation to ensure correct question count before transitioning |

---

## Testing Checklist

1. Create a room with 2 players
2. Add "Geography" category to queue
3. Start the game
4. Verify BOTH players see the SAME geography questions (same text, same answer order)
5. Complete the round
6. On results screen, verify queue preview shows NEXT category (not Geography again)
7. If queue is empty, verify "კატეგორიის დამატება" button appears
8. Add another category from results screen
9. Continue and verify sync works for second round

