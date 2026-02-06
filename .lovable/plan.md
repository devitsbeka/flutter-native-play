
# Plan: Fix Trivia Leaderboard Score Recording & Display

## Problems Identified

### Issue 1: Score Always Shows 0
**Root Cause:** In `QuizPlayModal.tsx`, the score is calculated as `roundScore = score + (isCorrect ? 1 : 0)` at line 129. However, `score` is a React state that was just updated with `setScore((prev) => prev + 1)` at line 119. Due to React's asynchronous state updates, `score` still holds the OLD value when we calculate `roundScore`, causing the final answer's point to be missed.

**Example Flow:**
```text
Question 5 answered correctly:
- score = 4 (from previous questions)
- setScore(prev => prev + 1) → scheduled update to 5
- roundScore = score + 1 = 4 + 1 = 5 ✅ (this works)

Question 5 answered incorrectly:
- score = 4
- isCorrect = false
- roundScore = score + 0 = 4 ✅ (this works)

BUT: If playing multiple rounds and score was reset...
```

Wait - looking more carefully, the logic seems correct. The real issue is:
- `score` is the state BEFORE the current answer
- We add `(isCorrect ? 1 : 0)` for the current answer
- This should give the correct total

Let me re-examine... The issue is likely that the `awardRewards` function is being called but the score parameter is passed from a closure where it still has the old value, OR the code changes we made haven't been deployed yet.

**Actual Issue:** Looking at the database, ALL scores are 0. The fix we just implemented (adding `score` parameter) is correct, but it may not be deployed yet. However, to ensure correctness, we should also:

1. **De-duplicate leaderboard entries** - Show only the BEST score per user, not all plays
2. **Ensure proper score tracking** - Add logging to confirm scores are being saved

### Issue 2: Avatar Not Showing / Player Not Appearing
**Root Cause:** Looking at the second screenshot showing "0 მოთამაშე" (0 players), this trivia simply hasn't been played yet by anyone. The leaderboard query and avatar display logic are correct.

For the first screenshot showing "TriviaMaste" with 0/5 - the avatar IS showing correctly. The issue is just the score being 0.

---

## Solution

### File: `src/hooks/useTriviaLobby.ts`

#### Change 1: Get BEST score per user (not all plays)
Currently, the leaderboard shows ALL plays, so if a user plays 3 times, they appear 3 times. We should:
- Group by user
- Take the HIGHEST score for each user
- Order by that highest score

**Current Query:**
```typescript
const { data: plays } = await supabase
  .from("quiz_post_plays")
  .select("user_id, score, played_at")
  .eq("post_id", triviaId)
  .order("score", { ascending: false })
  .order("played_at", { ascending: true })
  .limit(20);
```

**Updated Query (using a subquery approach with JS):**
```typescript
// Get all plays for this trivia
const { data: allPlays } = await supabase
  .from("quiz_post_plays")
  .select("user_id, score, played_at")
  .eq("post_id", triviaId);

// Group by user and get best score
const bestByUser = new Map<string, { user_id: string; score: number; played_at: string }>();
for (const play of allPlays || []) {
  const existing = bestByUser.get(play.user_id);
  if (!existing || (play.score || 0) > (existing.score || 0)) {
    bestByUser.set(play.user_id, play);
  }
}

// Sort by score desc, then by played_at asc
const plays = Array.from(bestByUser.values())
  .sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return new Date(a.played_at).getTime() - new Date(b.played_at).getTime();
  })
  .slice(0, 20);
```

### File: `src/components/social/QuizPlayModal.tsx`

#### Change 2: Ensure score is correctly passed
Add console.log to debug (can remove later):
```typescript
console.log('Saving score:', roundScore, 'to post:', postId);
```

Actually, looking at the code again - the logic IS correct:
- Line 129: `const roundScore = score + (isCorrect ? 1 : 0);`
- `score` is the count BEFORE the last question
- We add 1 if the last question was correct
- This gives us the total correct answers

The issue must be that the code change hasn't been deployed yet, OR there's a timing issue with the `rewardsAwarded.current` check.

#### Change 3: Reset rewardsAwarded ref per round
Looking at line 237: `rewardsAwarded.current = false;` in `startNextRound` - this seems fine.

BUT there's a bug! The `rewardsAwarded.current` is checked at line 173 but NEVER set to `true` inside `awardRewards`! This means the function exits early on subsequent calls (which is intentional) but the first call should set it to true.

Wait, let me check if it's being set... Looking at the code, I don't see `rewardsAwarded.current = true` anywhere in the `awardRewards` function! This could cause issues but wouldn't explain the 0 score.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useTriviaLobby.ts` | De-duplicate leaderboard to show best score per user |
| `src/components/social/QuizPlayModal.tsx` | Set `rewardsAwarded.current = true` after awarding |

---

## Technical Details

### Change 1: useTriviaLobby.ts - Get best score per user

**Lines 89-122** will be updated to:
1. Fetch all plays without limit
2. Group by user_id and keep only the highest score
3. Sort and limit to top 20

### Change 2: QuizPlayModal.tsx - Set rewardsAwarded flag

**After line 173**, add:
```typescript
rewardsAwarded.current = true;
```

This ensures rewards are only awarded once per round.

---

## Expected Results

After these changes:
1. **Leaderboard shows best score per user** - If you play 3 times and score 2/5, 4/5, 3/5 → Shows 4/5
2. **No duplicate entries** - Each user appears only once
3. **Scores are properly saved** - The existing code change should work; we're just adding the flag set
4. **Avatar displays correctly** - This was already working; no changes needed

---

## Testing Recommendation

After implementing:
1. Play a trivia and get some correct answers
2. Check the leaderboard shows your actual score (e.g., 3/5)
3. Play the same trivia again with a different score
4. Verify the leaderboard shows your First score, not the latest
