

## Fix: Inconsistent Game Count in User Deep Dive Modal

### Problem
The header shows "4 games" (from `profiles.games_played`), but the Overview tab shows "0 TOTAL GAMES" because it sums rows from `game_sessions`, `game_plays`, and `room_match_history` tables separately. These tables may not have data for every game type, making the count unreliable.

### Solution
Use `user.games_played` from the profiles table as the single source of truth for **Total Games** in the Overview tab. Similarly, use `user.games_won` for win rate and other profile-level stats that are already tracked authoritatively.

### Changes

**File: `src/components/admin/analytics/UserDetailModal.tsx`**

1. In the `overview` useMemo computation (around line 121-161):
   - Change `totalGames` to use `user.games_played` instead of `gameSessions.length + gamePlays.length + roomHistory.length`
   - Change `winRate` to use `user.games_won / user.games_played` instead of counting from `game_sessions` alone
   - Keep `bestStreak` from `profileData` but fall back to `user` data if available

2. Keep the per-table counts (matchmaking, category, room) as supplementary detail in the Game History tab -- those are still useful for breakdown purposes.

### Result
- Header and Overview will both show "4 games" consistently
- Win rate will reflect the same data source as the profile
- Game History tab still shows the detailed per-table breakdown independently

