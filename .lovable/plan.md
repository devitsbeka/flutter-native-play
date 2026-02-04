
# Plan: Fix Missing `total_questions` Update in `startNextFromQueue`

## Problem Summary

When a second round starts from the queue (library category), the game ends after just 1 question and shows the results page. This happens because the room's `total_questions` field is not being updated when starting a round with a library category from the queue.

## Root Cause

In `MultiplayerContextV2.tsx`, the `startNextFromQueue` function has two code paths:

1. **User trivia branch** (lines 1885-1896): Correctly updates `total_questions: questions.length` in the database
2. **Library/random category branch** (lines 2044-2055): **Missing** `total_questions` update

When the library category branch runs, the room keeps its old `total_questions` value from the previous game. If the previous game had only 1 question, the stale value persists and the new round also thinks it should have only 1 question.

## Database Evidence

Current room state shows:
- `total_questions: 1` (stale from previous game)
- Only 1 question in `room_questions` table

## Solution

Add `total_questions: questions.length` to the database update in the library/random category branch of `startNextFromQueue`.

## Technical Changes

### File: `src/contexts/MultiplayerContextV2.tsx`

**Location: Lines 2044-2055 (library/random category update)**

Add `total_questions: questions.length` to both:
1. The database update (supabase `.update()` call)
2. The local state update (`setState()` call)

**Before:**
```typescript
// Update room with new category and game info (after questions are committed)
await supabase
  .from("game_rooms")
  .update({
    category_id: newCategoryId,
    category_name: newCategoryName,
    used_question_ids: newUsedIds,
    status: "playing",
    started_at: new Date().toISOString(),
    current_game_id: game?.id,
  })
  .eq("id", roomId);

// Update state with new category and questions
setState(prev => ({
  ...prev,
  currentRoom: prev.currentRoom ? {
    ...prev.currentRoom,
    category_id: newCategoryId,
    category_name: newCategoryName,  // <-- Missing total_questions!
  } : null,
  // ...
}));
```

**After:**
```typescript
// Update room with new category and game info (after questions are committed)
await supabase
  .from("game_rooms")
  .update({
    category_id: newCategoryId,
    category_name: newCategoryName,
    used_question_ids: newUsedIds,
    total_questions: questions.length,  // <-- ADD THIS
    status: "playing",
    started_at: new Date().toISOString(),
    current_game_id: game?.id,
  })
  .eq("id", roomId);

// Update state with new category and questions
setState(prev => ({
  ...prev,
  currentRoom: prev.currentRoom ? {
    ...prev.currentRoom,
    category_id: newCategoryId,
    category_name: newCategoryName,
    total_questions: questions.length,  // <-- ADD THIS
  } : null,
  // ...
}));
```

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/MultiplayerContextV2.tsx` | Add `total_questions: questions.length` to database and state updates in library/random category branch (around lines 2047 and 2063) |

## Expected Behavior After Fix

1. First round plays with 5 questions
2. Click "Next Round" from results (with queue item)
3. `startNextFromQueue` fetches 5 new questions
4. **Room's `total_questions` is updated to `5`** (instead of staying at stale value)
5. Game plays through all 5 questions
6. Results screen shows after all questions are answered

## Why This Bug Occurred

The user trivia branch was implemented correctly with `total_questions: questions.length`, but when the library category branch was added later, the `total_questions` field was inadvertently omitted from both the database update and state update.
