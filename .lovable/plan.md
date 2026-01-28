

# Plan: Fix Category Mismatch Between Host and Players in Multiplayer Rooms

## Problem Summary

When the host adds categories to the queue and starts the next round from the results screen, **the host sees the correct new category/questions, but other players see a different (older) category**.

## Root Cause Analysis

The issue is a **race condition + stale data problem** in the realtime subscription for non-host players.

```text
Current Flow (BROKEN):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Both players are on RESULTS screen                          │
│     - Host: phase = "results"                                   │
│     - Player: phase = "results"                                 │
│                                                                 │
│  2. Host clicks "გაგრძელება" (Continue)                          │
│     └─► Calls startNextFromQueue()                              │
│         ├─► Fetches queue item (new category)                   │
│         ├─► Clears old room_questions                           │
│         ├─► Inserts NEW questions into room_questions           │
│         ├─► Updates game_rooms.status = "playing"               │
│         └─► Host's local state updated with NEW questions       │
│                                                                 │
│  3. Player receives realtime event (game_rooms UPDATE)          │
│     └─► status changed to "playing"                             │
│                                                                 │
│  4. Player's subscription ONLY triggers if:                     │
│     state.phase === "lobby" ← THIS IS FALSE!                    │
│     Player's phase is "results", NOT "lobby"                    │
│                                                                 │
│  5. RESULT: Player's subscription handler is SKIPPED            │
│     - Player never fetches new questions                        │
│     - Player still has OLD questions in local state             │
│     - Player sees wrong category/questions                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Critical Bug Location

**File:** `src/contexts/MultiplayerContextV2.tsx`
**Line 225:**
```typescript
if (updated.status === "playing" && state.phase === "lobby") {
  // Non-host: fetch questions when game starts
  if (!isHost) {
    // ... fetch room_questions
  }
}
```

The condition `state.phase === "lobby"` is **too restrictive**. When players are on the results screen, their phase is `"results"`, not `"lobby"`. So when the host starts a new round directly from results, the player's subscription handler never runs, and they keep their old questions.

---

## Solution

Expand the condition to include players on the results screen. The question-fetching logic should trigger when:
1. Room status changes to "playing"
2. Player is NOT the host
3. Player's current phase is `"lobby"` OR `"results"`

### Technical Changes

**File:** `src/contexts/MultiplayerContextV2.tsx`

**Change at line 225:**

Before:
```typescript
if (updated.status === "playing" && state.phase === "lobby") {
```

After:
```typescript
if (updated.status === "playing" && (state.phase === "lobby" || state.phase === "results")) {
```

This single change ensures that when the host starts a new round from the results screen, non-host players (who are also on results) will properly fetch the new questions from `room_questions`.

---

## Why This Works

1. **Host starts new round** → Updates `game_rooms.status` to "playing"
2. **Player receives realtime event** → `updated.status === "playing"`
3. **Player's phase is "results"** → Now passes the condition check
4. **Player fetches from `room_questions`** → Gets the NEW questions that host just inserted
5. **Both players now have same questions** → Sync is restored

---

## Edge Cases Handled

| Scenario | Outcome |
|----------|---------|
| Host starts from lobby | Works (phase is "lobby") |
| Host starts from results | Works now (phase is "results") |
| Player joins mid-game | Still handled by `enterRoom()` function |
| Player disconnects and rejoins | Handled by existing reconnection logic |

---

## Additional Safety: Reset Participant Scores

There's also a secondary issue: when `startNextFromQueue` resets participant scores, it only resets the caller's score:

**Current (line 1173-1177):**
```typescript
await supabase
  .from("room_participants")
  .update({ score: 0, current_question: 0, status: "playing" })
  .eq("room_id", roomId)
  .eq("user_id", user.id);  // ← Only resets HOST
```

This should reset ALL participants for a fair game start. We should remove the `user_id` filter:

**Fixed:**
```typescript
await supabase
  .from("room_participants")
  .update({ score: 0, current_question: 0, status: "playing" })
  .eq("room_id", roomId);
  // Resets ALL participants
```

This needs to be fixed in multiple places within `startNextFromQueue`.

---

## Summary of Changes

| File | Line | Change |
|------|------|--------|
| `MultiplayerContextV2.tsx` | 225 | Change condition from `phase === "lobby"` to `phase === "lobby" \|\| phase === "results"` |
| `MultiplayerContextV2.tsx` | 1173-1177 | Remove `.eq("user_id", user.id)` to reset ALL participants |
| `MultiplayerContextV2.tsx` | 1293-1297 | Same fix - reset ALL participants, not just host |

---

## Host Play Policy Note

Regarding "what host can play / what can't play":
- This is a **separate feature** implemented in the TV context for observer mode
- In regular multiplayer rooms (non-TV), there's no observer policy yet
- The host plays alongside other players in regular rooms
- The observer/suggester policy from the TV context has NOT been ported to regular multiplayer yet

If you want the same "host can't play their own trivias" rule in regular rooms, that would be a separate feature to implement after fixing this sync bug.

---

## Testing Checklist

1. Create a room with 2 players
2. Play first round to completion (both on results)
3. Host adds a new category to queue from lobby
4. Host goes back to results and clicks "გაგრძელება"
5. Verify BOTH players see the same new category and questions
6. Verify both players' scores are reset to 0
7. Complete the round and verify scoring works correctly

