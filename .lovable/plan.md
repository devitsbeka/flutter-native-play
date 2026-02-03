

# Plan: Fix Multiplayer Round Synchronization Issues

## Problem Summary

Based on database analysis and user reports, there are critical synchronization bugs causing non-host players to see different questions than the host in subsequent rounds.

### Evidence from Database

**Room: `20f315a1-ca09-4ee2-9e3c-ac76187e91aa`**
- Room has `user_trivia_id: 90aa4473` (Disney - "დისნეის სამყარო")
- **Game 1** (`12e904ab`): Questions are TikTok (from library) - NOT Disney!
- **Game 2** (`a8e38790`): Only 1 of 3 Disney questions was inserted (index 2)
- Old TikTok questions (indices 0, 1) still exist in table alongside new Disney question

**Current `room_questions` state:**
| game_id | index | question |
|---------|-------|----------|
| 12e904ab | 0 | TikTok/Musical.ly (OLD - should be deleted) |
| 12e904ab | 1 | TikTok content type (OLD - should be deleted) |
| a8e38790 | 2 | Mary Poppins (ONLY 1 of 3 inserted) |

---

## Root Causes Identified

### 1. `startNextFromQueue` Ignores Room's `user_trivia_id`

When continuing after results, if the queue has items from a previous session, those get played instead of what the host currently has selected.

**Current behavior:**
```text
handlePlayAgain() called
  → queue.length > 0?
    → YES: startNextFromQueue() uses queue item's data
    → NO: startNewRound() uses room's user_trivia_id
```

The queue might contain stale library categories or trivias that don't match the current selection.

### 2. Question Deletion/Insertion Race Condition

The delete and insert operations aren't truly atomic:
```typescript
await supabase.from("room_questions").delete().eq("room_id", roomId);
// GAP - non-host might fetch here and get 0 questions
await Promise.all(questions.map((q, index) => 
  supabase.from("room_questions").insert({...})
));
// Some inserts might fail silently
```

### 3. Non-Host Fallback Uses Stale Data

When game_id validation fails after retries, the code falls back to "unvalidated questions":
```typescript
if (roomQuestions && roomQuestions.length > 0) {
  console.warn("[MP] Using unvalidated questions as fallback");
  // This might use questions from a PREVIOUS game!
}
```

---

## Technical Fixes

### Fix 1: Clear Stale Queue Items on Trivia Selection

**File:** `src/components/team/RoomLobbyV2.tsx`

When the host selects a new trivia via `handleSelectTrivia`, also clear the queue to prevent stale items from interfering:

```typescript
const handleSelectTrivia = async (trivia: { id: string; title: string }) => {
  if (!currentRoom) return;
  
  try {
    // ... existing code ...
    
    // NEW: Clear the queue when making a direct selection
    // This prevents stale queue items from overriding the current selection
    await supabase
      .from("room_category_queue")
      .delete()
      .eq("room_id", currentRoom.id);
    
    await supabase
      .from("game_rooms")
      .update({ 
        category_id: null,
        category_name: trivia.title,
        total_questions: questions.length,
        user_trivia_id: trivia.id,
      })
      .eq("id", currentRoom.id);
    
    // ... rest of existing code ...
  }
}
```

Also apply same fix to `handleSelectCategory` and `handleSelectRandom`.

### Fix 2: Ensure Atomic Delete + Insert in `startNextFromQueue`

**File:** `src/contexts/MultiplayerContextV2.tsx`

Change the delete/insert pattern to use a transaction-like approach with verification:

```typescript
// In startNextFromQueue (around line 1510):

// Clear old data - WAIT for completion
const deleteResult = await supabase
  .from("room_questions")
  .delete()
  .eq("room_id", roomId);

if (deleteResult.error) {
  console.error("[MP] Failed to delete old questions:", deleteResult.error);
}

// Verify deletion before inserting
await new Promise(resolve => setTimeout(resolve, 50));

// Insert ALL questions and verify each succeeded
const insertResults = await Promise.all(questions.map((q, index) => 
  supabase.from("room_questions").insert({
    room_id: roomId,
    question_index: index,
    // ... other fields
  }).select()
));

// Verify all inserts succeeded
const failedInserts = insertResults.filter(r => r.error);
if (failedInserts.length > 0) {
  console.error("[MP] Some question inserts failed:", failedInserts);
  // Retry failed inserts
  for (const failed of failedInserts) {
    // ... retry logic
  }
}

// Verify question count matches expected
const { data: verifyData } = await supabase
  .from("room_questions")
  .select("id")
  .eq("room_id", roomId)
  .eq("game_id", game?.id);

if (!verifyData || verifyData.length !== questions.length) {
  console.error(`[MP] Question count mismatch: expected ${questions.length}, got ${verifyData?.length}`);
}
```

Apply the same fix to:
- `startGame` (lines 845-893)
- `startNewRound` (lines 1264-1298)

### Fix 3: Improve Non-Host Question Fetching

**File:** `src/contexts/MultiplayerContextV2.tsx`

Change the non-host question fetching to ONLY use game_id-validated questions, never falling back to stale data:

```typescript
// Around line 388-414
if (validQuestionsFound && roomQuestions && roomQuestions.length > 0) {
  // ... existing success handling
} else {
  console.error("[MP] Failed to fetch valid questions - DO NOT use stale data");
  
  // Instead of using unvalidated questions, show error and wait
  toast.error("კითხვების სინქრონიზაცია ვერ მოხერხდა. ცადე თავიდან.");
  
  // Set phase to waiting state, not playing with bad data
  setState(prev => ({
    ...prev,
    phase: "lobby", // Return to lobby instead of playing with stale data
    currentRoom: updated,
  }));
  return;
}
```

### Fix 4: Filter Room Questions by game_id in All Fetches

**File:** `src/contexts/MultiplayerContextV2.tsx`

When fetching questions, always filter by the current game_id:

```typescript
// In the retry loop (line 323-327):
const { data } = await supabase
  .from("room_questions")
  .select("*")
  .eq("room_id", roomId)
  .eq("game_id", expectedGameId) // ADD THIS FILTER
  .order("question_index", { ascending: true });
```

This ensures we only get questions for the CURRENT game, not leftover questions from previous games.

---

## Summary of Files to Modify

1. **`src/components/team/RoomLobbyV2.tsx`**
   - `handleSelectTrivia`: Clear queue on selection
   - `handleSelectCategory`: Clear queue on selection  
   - `handleSelectRandom`: Clear queue on selection

2. **`src/contexts/MultiplayerContextV2.tsx`**
   - Non-host question fetching: Add game_id filter, remove fallback
   - `startGame`: Add insert verification
   - `startNewRound`: Add insert verification
   - `startNextFromQueue`: Add insert verification

---

## Expected Behavior After Fix

1. **Trivia Selection**: When host picks a trivia, queue is cleared so only that trivia plays
2. **Question Sync**: All questions are verified to be inserted before room status changes
3. **Non-Host**: Only sees questions for the current game_id, never stale data
4. **Error Handling**: If sync fails, user returns to lobby with clear error message

