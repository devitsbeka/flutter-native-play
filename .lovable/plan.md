

## Fix: Changes Not Persisting and Icon Preview

### Root Cause

The save function invalidates `my-quiz-posts` and `quiz-posts-with-profiles`, but does NOT invalidate `trivia-details-with-creator` -- the query used by the `/trivia/:triviaId` detail page the user is viewing. Changes ARE saved to the database, but the UI shows stale cached data.

### Changes

**File: `src/components/social/EditQuizModal.tsx`**

1. Add invalidation for `trivia-details-with-creator` after save so the trivia detail page refetches fresh data
2. Also invalidate `trivia-leaderboard` and `trivia-stats` for completeness
3. These invalidations use the quiz ID so the correct cache entry is cleared

### Technical Details

In the `handleSave` function (around line 163), add:

```text
queryClient.invalidateQueries({ queryKey: ["trivia-details-with-creator", quiz.id] });
queryClient.invalidateQueries({ queryKey: ["trivia-leaderboard", quiz.id] });
queryClient.invalidateQueries({ queryKey: ["trivia-stats", quiz.id] });
```

This is a 3-line addition. No other changes needed -- the icon updating and question editing logic is already correct in state; the problem is only that the detail page never refetches after save.

