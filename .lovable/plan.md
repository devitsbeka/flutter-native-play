

## Add "Remove from Leaderboard" Feature

### What It Does
When you tap on your own entry in the trivia leaderboard, a confirmation dialog appears asking if you want to remove yourself. Confirming deletes all your play records for that trivia, removing you from the leaderboard.

### Changes

**1. Database: Add DELETE policy**

The `quiz_post_plays` table currently has no DELETE policy, so users can't delete their own records. We need to add one:
- Policy: "Users can delete their own plays" -- allows `DELETE` where `auth.uid() = user_id`

**2. TriviaLobby.tsx -- Add tap-to-remove UI**

- When you tap your own leaderboard entry, show an alert dialog (using the existing Radix AlertDialog) asking "ლიდერბორდიდან წაშლა?" (Remove from leaderboard?)
- On confirm, delete all `quiz_post_plays` records matching `user_id` and `post_id`
- Refetch leaderboard after deletion
- Other users' entries continue to open the profile modal as before

**3. useTriviaLobby.ts -- Add delete function**

- Export a `removeFromLeaderboard` function that:
  - Deletes all rows from `quiz_post_plays` where `user_id = current user` AND `post_id = triviaId`
  - Invalidates the leaderboard and stats queries so the UI updates immediately

### Technical Details

- Only your own entry is tappable for removal; other entries still open the profile modal
- The confirmation dialog prevents accidental removals
- All play records for that trivia are deleted (not just the best one), so the user fully disappears from the leaderboard
- The leaderboard, stats, and user play queries are all refetched after deletion

