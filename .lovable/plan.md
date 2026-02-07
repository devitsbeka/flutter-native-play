

## Fix: Non-Host Sees Previous Questions + Queue Clears on Room Return

### Root Cause Analysis

There are **two interconnected bugs** causing this behavior:

---

### Bug 1: Non-Host Gets Old Questions (Premature Realtime Trigger)

**The sequence that causes the problem:**

1. Game round ends. Host fires `status: "completed"` update but **WITHOUT `await`** (line 1402 -- fire-and-forget)
2. Both players transition to results screen locally (`phase: "results"`)
3. Host clicks "Continue" which calls `startNextFromQueue()`
4. `startNextFromQueue` immediately updates `host_is_observer` (line 1863) -- this is a **separate room update BEFORE questions are replaced**
5. If the fire-and-forget "completed" update from step 1 hasn't committed yet, the room status in DB is still `"playing"`
6. The `host_is_observer` update triggers a realtime event where `updated.status === "playing"`
7. Non-host's handler matches: `updated.status === "playing" && currentPhase === "results"` -- condition passes!
8. Non-host clears local state, fetches `current_game_id` -- but it's still the **OLD game_id** (new one hasn't been set yet)
9. Non-host fetches questions with old game_id, finds old questions (haven't been deleted yet), loads them, and sets `phase: "playing"`
10. Later, when the REAL room update comes (with new game_id and new questions committed), the non-host's `phaseRef.current` is already `"playing"`, so the condition `currentPhase === "lobby" || currentPhase === "results"` **FAILS**
11. Non-host stays stuck with old questions

```text
Timeline:
                                                                                    
Host:   [game ends] --fire&forget "completed"--> [Continue clicked] --> [update host_is_observer] --> [delete old Qs] --> [insert new Qs] --> [300ms wait] --> [update room: playing + new game_id]
                                                                              |                                                                                    |
                                                                              v                                                                                    v
DB:     status may still be "playing"                              realtime fires with                                               realtime fires with
        (fire-and-forget not committed)                            status="playing" (PREMATURE!)                                     status="playing" + new game_id
                                                                              |                                                                                    |
                                                                              v                                                                                    v
Non-host:                                                          Matches condition!                                                phase is already "playing"
                                                                   Fetches OLD game_id                                               Condition FAILS - event ignored
                                                                   Gets OLD questions
                                                                   Sets phase="playing" with old data
```

### Bug 2: Queue Appears Cleared

This is a **consequence of Bug 1**. When the non-host plays with old questions while the host plays new ones, the game states become desynchronized. Additionally, `startNextFromQueue` correctly consumes the queue item (deletes it). If the queue only had one item, it becomes empty. When the host later returns to the lobby via `continueInRoom`, it checks the queue, finds it empty, and clears category data -- this is actually expected behavior for an empty queue, but due to Bug 1 the games were desynchronized so the experience feels broken.

---

### Technical Changes

**File: `src/contexts/MultiplayerContextV2.tsx`**

**Fix 1: Merge `host_is_observer` into the final room update (prevents premature realtime event)**

In `startNextFromQueue`, remove the separate `host_is_observer` update at line 1862-1866 and include it in the final room update at lines 1958-1968 (user trivia path) and lines 2123-2134 (library category path).

Before:
```typescript
// Line 1862-1866: Separate early update (CAUSES BUG)
if (currentUserIsHost) {
  await supabase
    .from("game_rooms")
    .update({ host_is_observer: hostShouldObserve })
    .eq("id", roomId);
}

// ... questions deleted, new game created, questions inserted, 300ms wait ...

// Line 1958-1968: Final room update
await supabase
  .from("game_rooms")
  .update({
    category_name: categoryName,
    total_questions: questions.length,
    status: "playing",
    started_at: new Date().toISOString(),
    current_game_id: game?.id,
  })
  .eq("id", roomId);
```

After:
```typescript
// REMOVED: No separate host_is_observer update

// ... questions deleted, new game created, questions inserted, 300ms wait ...

// Final room update - NOW includes host_is_observer
await supabase
  .from("game_rooms")
  .update({
    category_name: categoryName,
    total_questions: questions.length,
    status: "playing",
    started_at: new Date().toISOString(),
    current_game_id: game?.id,
    host_is_observer: hostShouldObserve,  // Moved here to prevent premature realtime trigger
  })
  .eq("id", roomId);
```

This change needs to be applied in BOTH paths inside `startNextFromQueue`:
- User trivia path (around lines 1958-1968)
- Library category path (around lines 2123-2134)

**Fix 2: Await the "completed" status update in `nextQuestion`**

Line 1402 currently fires the "completed" update without `await`. This creates a window where the room status is still "playing" in the DB even though the game has ended.

Before:
```typescript
if (state.currentRoom && isHost) {
  supabase  // NOT awaited!
    .from("game_rooms")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", state.currentRoom.id);
}
```

After:
```typescript
if (state.currentRoom && isHost) {
  await supabase  // NOW awaited
    .from("game_rooms")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", state.currentRoom.id);
}
```

### Why These Fixes Work Together

- **Fix 1** eliminates the premature realtime event entirely. The non-host will only receive a realtime event when ALL data (questions, game_id, status, observer mode) is ready and committed. No more early fetch with stale game_id.

- **Fix 2** ensures the room status transitions cleanly: `playing` -> `completed` -> `playing` (next round). Without this, the intermediate `host_is_observer` update (even though we're moving it) could still cause issues in other edge cases.

### Files Changed
- `src/contexts/MultiplayerContextV2.tsx` (3 locations)

