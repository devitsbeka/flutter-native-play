

## Remove Test Accounts from Leaderboards

### What will happen
The 4 test accounts (Mako, Testera, Lola, koka) will be completely removed from leaderboards and excluded from analytics, just like the existing mascot/fake accounts.

### Steps

**1. Add to excluded users list**
Add these 4 user IDs to the `MASCOT_USER_IDS` set in `src/lib/excludedUsers.ts`:
- `fb151184-10be-4496-b654-ffcf66de0536` (Mako)
- `feccf29c-d308-4240-9086-853316321753` (Testera)
- `750ad305-db5f-40bc-b8b3-1411c68024b8` (Lola)
- `687e47bc-e90c-4252-95e2-61e3170a892d` (koka)

This ensures they are excluded from all analytics dashboards.

**2. Remove from leaderboard database**
Delete their rows from `user_league_data` so the `get_league_leaderboard` RPC no longer returns them. This immediately removes them from all league tiers.

**3. Mark profiles as deleted**
Set their nickname to `[წაშლილი]` (the existing "deleted" convention) so any fallback query path also filters them out.

### Technical details
- The `get_league_leaderboard` RPC already filters `nickname != '[წაშლილი]'`, so renaming handles the DB-level filtering
- The `MASCOT_USER_IDS` set handles frontend analytics exclusion
- Deleting `user_league_data` rows removes them from cached leaderboard queries immediately after cache refresh

