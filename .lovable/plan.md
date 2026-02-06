

# Plan: Fix Quiz Score Not Saving to Leaderboard

## Problem

When a user plays a trivia game, their score is displayed as `0/5` on the leaderboard because the `score` value is not being saved to the database.

**Root Cause:** In `QuizPlayModal.tsx`, the `awardRewards` function inserts a record into `quiz_post_plays` but omits the `score` field:

```typescript
await supabase.from('quiz_post_plays').insert({
  user_id: user.id,
  post_id: postId,
  // score is MISSING!
});
```

The database table has a `score` column (as seen in Supabase types), but it defaults to `null` when not provided, causing the leaderboard to show `0/5`.

---

## Solution

Modify the `awardRewards` function to accept and save the score to the database.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/social/QuizPlayModal.tsx` | Add score parameter to `awardRewards` and include it in the insert |

---

## Implementation Details

### 1. Update Function Signature (Line ~172)

**Before:**
```typescript
const awardRewards = async (xp: number, coins: number, postId?: string) => {
```

**After:**
```typescript
const awardRewards = async (xp: number, coins: number, postId?: string, score?: number) => {
```

### 2. Add Score to Database Insert (Line ~190)

**Before:**
```typescript
await supabase.from('quiz_post_plays').insert({
  user_id: user.id,
  post_id: postId,
});
```

**After:**
```typescript
await supabase.from('quiz_post_plays').insert({
  user_id: user.id,
  post_id: postId,
  score: score ?? 0,
});
```

### 3. Pass Score When Calling awardRewards

**At line ~148 (multi-round):**
```typescript
awardRewards(xpEarned, coinsEarned, currentRoundPost?.id, roundScore);
```

**At line ~158 (single round or final round):**
```typescript
awardRewards(xpEarned, finalCoins, currentRoundPost?.id, roundScore);
```

---

## Data Flow Summary

```text
User answers questions
       ↓
handleAnswer() calculates: roundScore = score + (isCorrect ? 1 : 0)
       ↓
awardRewards(xp, coins, postId, roundScore)
       ↓
INSERT INTO quiz_post_plays (user_id, post_id, score)
       ↓
Leaderboard displays {entry.score}/{trivia.question_count}
```

---

## Impact

- **TriviaLobby leaderboard**: Will correctly show `3/5`, `5/5`, etc. instead of `0/5`
- **Stats calculation**: `avgScore` and `highestScore` in `useTriviaLobby` will work correctly
- **Historical data**: Previously played games will still show `0` (only new plays will have scores)

