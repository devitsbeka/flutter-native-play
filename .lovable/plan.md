
# Plan: Comprehensive Fix for Question Count Bug in Multiplayer Rounds

## Problem Summary

When a second round starts after a 1-question user trivia round, the game only fetches 1 question instead of 5, causing it to end immediately. The fix applied to `startNextFromQueue` wasn't sufficient because there are multiple code paths and fallback scenarios.

## Root Cause Analysis

The bug has **two interrelated issues**:

### Issue 1: Stale `total_questions` in `startNewRound`

At line 1447 in `MultiplayerContextV2.tsx`:
```typescript
const questionCount = freshRoom.total_questions || 5;
```

This reads the stale `total_questions` value (e.g., `1`) from the previous round and uses it for the new round.

### Issue 2: `startNextFromQueue` Fallback to `startNewRound`

When `startNextFromQueue` doesn't find queue items (possibly due to timing/race condition), it falls back to `startNewRound()` at line 1755. This path inherits the stale question count bug.

### Evidence from Database

The room shows:
- `total_questions: 1` (stale from previous user trivia)
- `category_id: null` (previous game was user trivia)
- Queue still has "პოლიტიკა" (Politics) item unprocessed

The question in `room_questions` is from "ცნობილი ადამიანები" (Famous People), NOT from the queue's "პოლიტიკა" category, confirming that the random mode was triggered (not the queue path).

## Solution

Fix the question count in **both** functions to use a fresh default for new rounds:

### 1. Fix `startNewRound` (Line 1447)

**Before:**
```typescript
const questionCount = freshRoom.total_questions || 5;
```

**After:**
```typescript
// FIX: Always use fresh default for new rounds
// Don't rely on stale total_questions from previous round
const questionCount = 5;
```

### 2. Ensure `startNextFromQueue` Uses Fresh Default (Already Fixed)

This was already fixed in a previous change:
```typescript
const questionCount = 5; // Already fixed
```

## Flow After Fix

| Step | What Happens |
|------|--------------|
| 1 | First round plays user trivia (1 question) |
| 2 | User clicks "Next Round" |
| 3 | `handlePlayAgain` → `startNextFromQueue()` |
| 4a | **If queue found:** Uses queue item category, fetches 5 questions |
| 4b | **If queue empty/fallback:** `startNewRound()` uses `questionCount = 5` |
| 5 | Game plays with 5 questions |

## Technical Changes

### File: `src/contexts/MultiplayerContextV2.tsx`

**Line 1447** - Change from:
```typescript
const questionCount = freshRoom.total_questions || 5;
```
To:
```typescript
const questionCount = 5;
```

## Why This Is Safe

1. **New rounds should always be fresh**: When starting a new round (whether from queue or repeat), the default of 5 questions is appropriate
2. **User trivias determine their own count**: The user trivia branch (lines 1468-1596) fetches questions from `user_quiz_posts.questions` and uses `questions.length`, bypassing the `questionCount` variable entirely
3. **Library categories should have 5 questions**: This is the standard for VS mode multiplayer
4. **No loss of functionality**: Previously, if someone set a custom count, it would persist. But in practice, multiplayer VS mode always uses 5 questions per round

## Files to Modify

| File | Location | Change |
|------|----------|--------|
| `src/contexts/MultiplayerContextV2.tsx` | Line 1447 | Replace `freshRoom.total_questions || 5` with `5` |
