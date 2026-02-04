
# Plan: Fix `startNextFromQueue` Using Stale Question Count

## Problem Summary

When a second round starts from the queue, only 1 question is fetched instead of 5, causing the game to end immediately. The database shows `total_questions: 1` even after the fix was applied.

## Root Cause

In `startNextFromQueue` at line 1739:

```typescript
const questionCount = state.currentRoom.total_questions || 5;
```

This reads `total_questions` from **local state**, which still has the value from the previous round. If the first round was a user trivia with only 1 question, `state.currentRoom.total_questions` would be `1`. This stale value is then used to fetch questions for the new round, resulting in only 1 question being fetched.

**The update to `total_questions: questions.length` happens AFTER the questions are fetched, so it can't fix a value that was already used incorrectly.**

## Why Previous Fix Didn't Work

The previous fix correctly added `total_questions: questions.length` to the database and state updates. However, the bug occurs BEFORE that update - when `questionCount` is read from stale state to determine how many questions to fetch.

## Solution

For `startNextFromQueue`, the queue item represents a NEW round (not a continuation), so we should use a **fresh default of 5 questions** instead of reading from stale state. This is consistent with how new games work.

## Technical Changes

### File: `src/contexts/MultiplayerContextV2.tsx`

**Location: Line 1739**

Change from reading stale state to using a fresh default:

**Before:**
```typescript
const roomId = state.currentRoom.id;
const questionCount = state.currentRoom.total_questions || 5;
```

**After:**
```typescript
const roomId = state.currentRoom.id;
// FIX: Use fresh default for new rounds from queue
// Don't read from stale state which may have old value from previous round
const questionCount = 5;
```

This is safe because:
1. Queue items always start a NEW round (not resuming an existing one)
2. The default for new games is 5 questions
3. For user trivia, the question count is determined by the trivia's questions array (handled separately in the user trivia branch)

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/MultiplayerContextV2.tsx` | Line 1739: Change `state.currentRoom.total_questions || 5` to just `5` |

## Expected Behavior After Fix

1. First round plays with any number of questions (e.g., 1 for a short trivia)
2. Click "Next Round" from results (with queue item)
3. `startNextFromQueue` uses default count of 5 (not stale value of 1)
4. `getQuestions()` fetches 5 questions
5. Database and state are updated with `total_questions: 5`
6. Game plays through all 5 questions
7. Results screen shows after all questions are answered

## Alternative Considered

We could fetch fresh `total_questions` from the database like `startGame` does. However, since queue items represent completely NEW rounds (not existing games), using a standard default is simpler and more appropriate.
