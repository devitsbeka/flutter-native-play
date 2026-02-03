
# Plan: Fix Multiplayer Round Synchronization

## Issues Identified

Based on thorough code and database analysis, I found several critical synchronization bugs causing non-host players to return to the lobby instead of seeing the next round.

### Evidence from Database
Room `20f315a1` (ფოცხვრის ნადიმი):
- **Game 1** (`12e904ab`): TikTok questions at indices 0, 1 - from library
- **Game 2** (`a8e38790`): Disney question but ONLY at index 2 - **indices 0, 1 are MISSING!**
- Old TikTok questions persist alongside new Disney question

**Root Cause**: The deletion wasn't atomic with insertion, and `Promise.all` for inserts failed silently for some questions.

---

## Root Causes

### Issue 1: Missing DB Commit Delay in `saveQuestionsAndStartGame`
The `saveQuestionsAndStartGame` helper function (used by `startGame` for library categories) is missing the 150ms delay between question insertion and room status update. Other functions (`startNewRound`, `startNextFromQueue`) have this delay, but the helper doesn't.

**Location**: `src/contexts/MultiplayerContextV2.tsx`, lines 971-1043

```text
Current flow:
1. Delete old questions
2. Insert new questions via Promise.all
3. Immediately update room status to "playing"  ← Problem: no delay!
4. Non-host detects status change, fetches questions before they're committed
```

### Issue 2: Missing DB Commit Delay in `startGame` (User Trivia Branch)
The user trivia branch in `startGame` (lines 845-877) also lacks the delay between question insertion and status update.

**Location**: Lines 845-877

### Issue 3: Non-Atomic Delete + Insert Pattern
All functions delete old questions, then insert new ones using `Promise.all`. If any insert fails silently, partial questions remain mixed with old data (as seen in database evidence).

### Issue 4: No Verification of Insert Success
`Promise.all` doesn't verify that all inserts succeeded. Some may fail silently, leaving incomplete question sets.

---

## Technical Fixes

### Fix 1: Add 150ms Delay to `saveQuestionsAndStartGame`

```typescript
// After Promise.all for question insertion:
await Promise.all(questions.map((q, index) => 
  supabase.from("room_questions").insert({...})
));

// ADD: Wait for DB commit before updating room status
await new Promise(resolve => setTimeout(resolve, 150));

// Then update room status
await supabase
  .from("game_rooms")
  .update({ status: "playing", ... })
  .eq("id", roomId);
```

### Fix 2: Add 150ms Delay to `startGame` User Trivia Branch

Same pattern - add delay between question insertion (line 858) and room status update (line 867).

### Fix 3: Add Insert Verification with Retry

For critical insert operations, verify all questions were inserted and retry failed ones:

```typescript
// Insert all questions
const insertResults = await Promise.all(
  questions.map((q, index) => 
    supabase.from("room_questions").insert({
      room_id: roomId,
      question_index: index,
      ...
    }).select()
  )
);

// Verify count matches
const { count } = await supabase
  .from("room_questions")
  .select("*", { count: "exact", head: true })
  .eq("room_id", roomId)
  .eq("game_id", game?.id);

if (count !== questions.length) {
  console.error(`[MP] Question count mismatch: expected ${questions.length}, got ${count}`);
  // Retry missing questions or handle error
}
```

### Fix 4: Use Transaction-Like Pattern for Delete + Insert

Ensure deletion completes before any insertion begins:

```typescript
// Step 1: Delete and verify
await supabase.from("room_questions").delete().eq("room_id", roomId);
await new Promise(resolve => setTimeout(resolve, 50)); // Brief wait for delete

// Step 2: Verify empty
const { count: remainingCount } = await supabase
  .from("room_questions")
  .select("*", { count: "exact", head: true })
  .eq("room_id", roomId);

if (remainingCount && remainingCount > 0) {
  console.warn("[MP] Questions not fully deleted, retrying...");
  await supabase.from("room_questions").delete().eq("room_id", roomId);
  await new Promise(resolve => setTimeout(resolve, 50));
}

// Step 3: Insert new questions
await Promise.all(questions.map(...));
```

---

## Files to Modify

### `src/contexts/MultiplayerContextV2.tsx`

1. **`saveQuestionsAndStartGame` (lines 971-1043)**:
   - Add 150ms delay after `Promise.all` insertion
   - Add insert verification

2. **`startGame` user trivia branch (lines 845-877)**:
   - Add 150ms delay after `Promise.all` insertion
   - Add insert verification

3. **`startNewRound` (lines 1251-1276)**:
   - Already has delay, add insert verification

4. **`startNextFromQueue` user trivia branch (lines 1511-1527)**:
   - Already has delay, add insert verification

5. **`startNextFromQueue` regular category branch (lines 1648-1663)**:
   - Already has delay, add insert verification

---

## Summary of Changes

| Function | Location | Current Delay | Fix Needed |
|----------|----------|---------------|------------|
| `saveQuestionsAndStartGame` | Line 1005-1021 | NONE | Add 150ms delay + verification |
| `startGame` (user trivia) | Line 858-876 | NONE | Add 150ms delay + verification |
| `startNewRound` (user trivia) | Line 1265 | 150ms | Add verification |
| `startNewRound` (library) | Line 1377 | 150ms | Add verification |
| `startNextFromQueue` (user trivia) | Line 1527 | 150ms | Add verification |
| `startNextFromQueue` (library) | Line 1663 | 150ms | Add verification |

---

## Expected Behavior After Fix

1. **All questions inserted before status update**: The 150ms delay ensures DB commits complete
2. **No partial question sets**: Verification confirms all questions were inserted
3. **Non-host receives correct questions**: game_id filtering ensures only current game's questions are fetched
4. **Clean round transitions**: Delete verification ensures no stale data remains

---

## Testing Recommendations

After implementation, test the following scenarios:
1. Host creates room, invites friend, plays library category → second round should sync
2. Host plays custom trivia → switch to library category → all players see new questions
3. Host plays library → switch to custom trivia → all players see custom questions
4. Multiple rapid round transitions → all players stay synchronized
