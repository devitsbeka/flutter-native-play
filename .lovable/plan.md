
# Multiplayer Flow Analysis & Fix

## Summary of Current State

After reviewing the complete multiplayer flow, I found that **most of the critical fixes are already in place**:

| Component | Status |
|-----------|--------|
| `startNextFromQueue` (line 1743) | ✅ Fixed - uses `questionCount = 5` |
| `startNewRound` (line 1449) | ✅ Fixed - uses `questionCount = 5` |
| Guest synchronization | ✅ Robust - 8 retries, 600ms delay, game_id validation |
| Delete-verify-insert pattern | ✅ Implemented - 3 retries with verification |
| UI layout stability | ✅ Fixed - answered indicator uses fixed-height container |
| Observer auto-progression | ✅ Working - advances when all players complete |

## Remaining Issue Found

There's **one remaining edge case** in the `startGame` function at line 972:

```typescript
const questionCount = freshRoom.total_questions || 5;
```

This reads `total_questions` from the database which could still have a stale value of `1` from a previous 1-question user trivia.

**Scenario where this matters:**
1. Host plays a 1-question user trivia → `total_questions` becomes `1`
2. Returns to lobby
3. Selects a new library category directly (not via queue)
4. Clicks "Start Game" 
5. `questionCount` = `1` (from stale database value)
6. Only 1 question is fetched → game ends immediately

## Database Evidence

Current rooms show mixed `total_questions` values - some at `5` (after recent fixes), others still at `1`:

```text
total_questions: 5 ← Recent room (fix working)
total_questions: 1 ← Older rooms (before fix)
total_questions: 1 ← Older rooms (before fix)
```

## Solution

Apply the same fix to `startGame` that was applied to `startNewRound` and `startNextFromQueue`.

### Technical Change

**File:** `src/contexts/MultiplayerContextV2.tsx`

**Line 972** - Change from:
```typescript
const questionCount = freshRoom.total_questions || 5;
```

To:
```typescript
// FIX: Always use fresh default for new games
// Don't rely on stale total_questions from previous round
const questionCount = 5;
```

## Why This Is Safe

1. **Library categories always use 5 questions** - This is the standard for VS mode
2. **User trivias bypass this variable** - They use `customQuestions.length` directly (lines 1006-1034)
3. **Consistent behavior** - All three game-start paths now use the same default
4. **No loss of functionality** - The room's `total_questions` is always updated with the actual count after questions are fetched

## Complete Fix Summary

After this change, all game-start paths will use fresh defaults:

| Function | Line | Fixed Value |
|----------|------|-------------|
| `startGame` | 972 | `const questionCount = 5;` |
| `startNewRound` | 1449 | `const questionCount = 5;` ✅ Already done |
| `startNextFromQueue` | 1743 | `const questionCount = 5;` ✅ Already done |

## Expected Outcome

Players can now play continuously without experiencing:
- Games ending after 1 question (regardless of which game-start path is used)
- UI jumping when opponents answer (fixed with reserved-height container)
- Icon flashing in category picker (fixed with overflow-hidden)
- Stale questions from previous rounds (game_id validation in place)
