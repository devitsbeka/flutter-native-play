

## Don't Show Fake Players on User's Own Trivias

### Problem
When a user creates a trivia, the lobby immediately shows 3-7 fake players with scores like "10/10", "7/10" etc. This looks unnatural since the trivia was just created seconds ago.

### Fix

**File: `src/hooks/useTriviaLobby.ts`** -- Skip fake leaderboard generation when the current user owns the trivia.

Update the `useMemo` block (lines 249-254) to check if the trivia creator is the current user:

```typescript
const leaderboard = useMemo(() => {
  if (realLeaderboard.length > 0) return realLeaderboard;
  if (!triviaId || !trivia) return [];
  // Don't show fake entries on the creator's own trivia
  if (user?.id && trivia.user_id === user.id) return [];
  return generateFakeTriviaLeaderboard(triviaId, trivia.question_count || 10);
}, [realLeaderboard, triviaId, trivia, user?.id]);
```

This is a single-line addition. Other users visiting the trivia will still see the fake leaderboard as a fallback, but the creator won't see fake plays on their own content.

