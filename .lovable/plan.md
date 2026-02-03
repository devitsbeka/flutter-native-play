
# Plan: Fix First Round Not Starting (Delete Race Condition)

## Problem Summary

The first round is not starting properly because **question deletion fails silently**, leaving old questions in the database that block new question inserts due to a unique constraint violation.

## Evidence

Database query results show:
- Room `20f315a1` has `current_game_id: a8e38790` (Disney trivia - round 2)
- But `room_questions` table contains:
  - **Index 0**: `game_id: 12e904ab` (OLD TikTok question - should be deleted!)
  - **Index 1**: `game_id: 12e904ab` (OLD TikTok question - should be deleted!)
  - **Index 2**: `game_id: a8e38790` (NEW Disney question - only one inserted)

The unique constraint `room_questions_room_id_question_index_key` on `(room_id, question_index)` is blocking inserts at indices 0 and 1 because old rows still exist.

## Why the 50ms Delay Isn't Working

The current code:
```typescript
await supabase.from("room_questions").delete().eq("room_id", roomId);
await new Promise(resolve => setTimeout(resolve, 50));
// Insert new questions...
```

**Problem**: The `delete()` call returns immediately after sending the request to Supabase, but the actual deletion may not be committed yet. The 50ms delay is a guess that doesn't guarantee the delete has completed.

## Root Cause

1. Delete is issued but not verified
2. 50ms passes but delete hasn't committed
3. Insert starts, but indices 0, 1 still exist → duplicate key error
4. Only index 2 (new) succeeds
5. Room status updates to "playing" with only 1 question
6. Non-host fetches 1 question, plays it, game completes immediately with 0 scores

## Technical Fix

### Solution: Verify Deletion Before Inserting

Add explicit verification that ALL old questions were deleted before proceeding with inserts. If not deleted, retry deletion with a longer delay.

**Pattern to apply in all 6 locations:**

```typescript
// Step 1: Delete old questions
await supabase.from("room_questions").delete().eq("room_id", roomId);
await supabase.from("player_answers").delete().eq("room_id", roomId);

// Step 2: VERIFY deletion completed - this is the missing piece!
let deleteVerified = false;
let retryCount = 0;
const MAX_DELETE_RETRIES = 3;

while (!deleteVerified && retryCount < MAX_DELETE_RETRIES) {
  await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
  
  const { count } = await supabase
    .from("room_questions")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);
  
  if (count === 0 || count === null) {
    deleteVerified = true;
    console.log(`[MP] Delete verified after ${retryCount + 1} attempt(s)`);
  } else {
    console.warn(`[MP] Delete not complete, ${count} questions remain. Retrying...`);
    await supabase.from("room_questions").delete().eq("room_id", roomId);
    retryCount++;
  }
}

if (!deleteVerified) {
  console.error("[MP] Failed to delete old questions after retries!");
  toast.error("თამაშის დაწყება ვერ მოხერხდა. ცადე თავიდან.");
  return; // Don't proceed with stale data
}

// Step 3: Now safe to insert new questions
const insertResults = await Promise.all(questions.map((q, index) => ...));
```

## Files to Modify

**`src/contexts/MultiplayerContextV2.tsx`**

Apply the verification pattern in all 6 delete+insert locations:

| Lines | Function | Current Pattern | Fix |
|-------|----------|----------------|-----|
| 815-819 | `startGame` (user trivia) | delete + 50ms + insert | Add verification loop |
| 1003-1008 | `saveQuestionsAndStartGame` | delete + 50ms + insert | Add verification loop |
| 1279-1283 | `startNewRound` (user trivia) | delete + 50ms + insert | Add verification loop |
| 1401-1405 | `startNewRound` (library) | delete + 50ms + insert | Add verification loop |
| 1563-1567 | `startNextFromQueue` (user trivia) | delete + 50ms + insert | Add verification loop |
| 1730-1734 | `startNextFromQueue` (library) | delete + 50ms + insert | Add verification loop |

## Implementation Details

### Create a reusable helper function:

```typescript
// Helper to safely delete room questions with verification
const safeDeleteRoomQuestions = async (roomId: string): Promise<boolean> => {
  await supabase.from("room_questions").delete().eq("room_id", roomId);
  await supabase.from("player_answers").delete().eq("room_id", roomId);
  
  let verified = false;
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { count } = await supabase
      .from("room_questions")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId);
    
    if (!count || count === 0) {
      verified = true;
      console.log(`[MP] Questions deleted and verified (attempt ${i + 1})`);
      break;
    }
    
    console.warn(`[MP] ${count} questions still exist, retrying delete...`);
    await supabase.from("room_questions").delete().eq("room_id", roomId);
  }
  
  return verified;
};
```

### Replace all occurrences of:
```typescript
await supabase.from("room_questions").delete().eq("room_id", roomId);
await supabase.from("player_answers").delete().eq("room_id", roomId);
await new Promise(resolve => setTimeout(resolve, 50));
```

### With:
```typescript
const deleteSuccess = await safeDeleteRoomQuestions(roomId);
if (!deleteSuccess) {
  toast.error("თამაშის დაწყება ვერ მოხერხდა");
  return;
}
```

## Expected Behavior After Fix

1. **Delete verification**: Ensures old questions are fully removed before inserting new ones
2. **Retry mechanism**: Handles slow database commits with multiple retry attempts
3. **Graceful failure**: If delete truly fails after retries, show error instead of proceeding with broken state
4. **All questions sync**: With clean delete, all new questions insert at indices 0, 1, 2, etc.
5. **Both players**: Host and non-host see the same questions and can play normally
