
# Multiplayer Round Transition Bug Fix Plan

## Problem Summary

When starting round 2 after round 1 completes, the non-host player is returned to the lobby while the host continues playing. Console logs show:
```
[MP] Failed to fetch questions for game_id ec3fa676-8f45-4984-8ece-444506cbc3d0 after 8 attempts
```

The game_id `ec3fa676...` belongs to a **different room**, indicating a state contamination issue.

## Root Cause Analysis

After extensive investigation, I identified **two related issues**:

### Issue 1: Non-Host Status Handling Gap

When the host calls `continueInRoom()` from results screen (after adding to queue), it:
1. Updates room `status: "waiting"` in database
2. Sets local `phase: "lobby"` for host only

The realtime subscription handler (lines 319-418) only handles:
- `status === "playing"` → fetch questions and transition to playing
- `status === "completed"` → transition to results
- `status === "cancelled"` → reset and cleanup

**Missing**: Handler for `status === "waiting"` that transitions non-host to lobby phase.

**Impact**: Non-host stays in `phase: "results"` while `currentRoom.status` is "waiting". When host starts game, non-host's phase check `(currentPhase === "lobby" || currentPhase === "results")` passes, but they may have inconsistent state.

### Issue 2: Cross-Room State Contamination

The failed game_id `ec3fa676...` belongs to room `LNPULM`, but the players are in room `UTC3JH`. This indicates:

1. Both users are participants in multiple rooms simultaneously
2. A browser tab or session from the other room may have leaked state
3. OR the realtime update payload captured a stale game_id before the new one was set

## Solution

### Change 1: Handle `status: "waiting"` for Non-Hosts

**File**: `src/contexts/MultiplayerContextV2.tsx`

Add handler for `waiting` status after the `cancelled` handler (after line 418):

```typescript
} else if (updated.status === "waiting" && currentPhase === "results") {
  // Host returned to lobby - non-host should follow
  console.log(`[MP] Room returned to waiting state, transitioning to lobby`);
  setState(prev => ({
    ...prev,
    phase: "lobby",
    questions: [],
    currentQuestionIndex: 0,
    myScore: 0,
    lastQuestionResult: null,
    opponentAnswers: {},
    currentRoom: updated,
  }));
}
```

This ensures non-hosts transition to lobby in sync with the host.

### Change 2: Add Game ID Freshness Validation

**File**: `src/contexts/MultiplayerContextV2.tsx`

In the question fetch logic (around line 335), add a safeguard to re-fetch the room's current_game_id directly from DB instead of trusting the realtime payload:

```typescript
// Get expected game_id FRESH from database (realtime payload could be stale)
const { data: freshRoomCheck } = await supabase
  .from("game_rooms")
  .select("current_game_id")
  .eq("id", roomId)
  .single();

const expectedGameId = freshRoomCheck?.current_game_id || updated.current_game_id;

console.log(`[MP] Non-host fetching questions with verified game_id: ${expectedGameId}`);
```

### Change 3: Clear Questions Before Status Update

In `saveQuestionsAndStartGame` (around line 1190), ensure the room status update happens AFTER questions are fully inserted with a longer delay:

```typescript
// CRITICAL: Wait longer for DB commit before updating room status
await new Promise(resolve => setTimeout(resolve, 300)); // Increased from 150ms
```

## Testing Checklist

After implementation, verify:

1. **Round Transition**: Start round 1 → complete → host adds category to queue → both players go to lobby
2. **Round Start**: Host starts round 2 → both players see questions simultaneously
3. **Question Sync**: All players see same questions in same order
4. **Multiple Tabs**: Test with user having multiple room tabs open - should not interfere
5. **Edge Case**: Non-host refreshes page during round transition → should resync correctly

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/MultiplayerContextV2.tsx` | Add `status: "waiting"` handler, add game_id freshness check, increase sync delay |

## Technical Notes

- The 800ms initial delay + 8 attempts × 600ms = ~5.6s total wait time for question sync
- New `waiting` handler ensures phase consistency between host and non-host
- Fresh game_id fetch eliminates stale realtime payload issues
- 300ms delay after insert gives more time for DB replication
