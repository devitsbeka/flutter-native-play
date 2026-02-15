
## Fix: Trivia Leaderboard Clearing After Play

### Problem
When a user finishes playing a trivia, the leaderboard on the lobby page only shows the current player instead of all previous players + the new score. The existing leaderboard data gets "cleared" from the user's perspective.

### Root Cause
In `QuizPlayModal.tsx`, after inserting the play record into `quiz_post_plays` (line 192), the component does NOT invalidate the `trivia-leaderboard` query cache. When the user navigates back to the lobby:
- The cached leaderboard data (30-second stale time) may still show old data
- Or the query refetches before the DB insert has fully committed, returning incomplete results

### Fix

#### File: `src/components/social/QuizPlayModal.tsx`

1. Import `useQueryClient` from `@tanstack/react-query`
2. After the `quiz_post_plays` insert succeeds (around line 196), invalidate the relevant trivia queries:
   - `trivia-leaderboard` -- so the lobby refetches the full leaderboard including the new play
   - `trivia-stats` -- so player count and average score update
   - `trivia-user-play` -- so the "already played" indicator updates

```typescript
// After the insert succeeds:
queryClient.invalidateQueries({ queryKey: ["trivia-leaderboard", postId] });
queryClient.invalidateQueries({ queryKey: ["trivia-stats", postId] });
queryClient.invalidateQueries({ queryKey: ["trivia-user-play", postId] });
```

This ensures that when the user returns to the trivia lobby page, the leaderboard data is fresh and includes ALL players, not just the one who just played.
