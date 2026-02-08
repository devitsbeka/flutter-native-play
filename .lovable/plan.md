
## Fix: Trivia Leaderboard Not Showing Players

### Problem

The leaderboard on the trivia lobby page shows "0 მოთამაშე" and "ჯერ არავის უთამაშია" (No one has played yet) even though the trivia has 54 plays. This happens because the database security policy on `quiz_post_plays` only allows users to see **their own** play records:

```
SELECT policy: auth.uid() = user_id
```

When the leaderboard query fetches all plays for a trivia, the database silently filters out other users' plays, returning only the current user's data (or nothing if they haven't played).

### Solution

Update the SELECT policy on `quiz_post_plays` to allow **anyone** (authenticated) to read all play records. The table only contains `user_id`, `post_id`, `score`, and `played_at` -- no sensitive information. This is the same pattern used for likes, saves, and other social engagement tables.

### Technical Details

**Database migration** -- replace the existing restrictive SELECT policy with a public one:

```sql
DROP POLICY "Users can view their own plays" ON quiz_post_plays;

CREATE POLICY "Anyone can view plays"
  ON quiz_post_plays
  FOR SELECT
  USING (true);
```

This single change will fix the leaderboard without requiring any code changes. The existing `useTriviaLobby` hook already fetches plays correctly -- it was just being blocked by the row-level security.

### Files Changed
- Database policy update only (no code file changes needed)
