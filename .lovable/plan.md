

## Fix: Missing Admin Read Access for User Analytics

### Root Cause
The User Deep Dive analytics modal shows incorrect data (Return Visits = 0, estimated Time Spent, etc.) because several database tables are missing admin SELECT policies. When an admin opens another user's profile, the Row Level Security (RLS) blocks reading their data from these tables:

| Table | Has Admin Read Policy? | Effect on Analytics |
|-------|----------------------|---------------------|
| `game_sessions` | No -- only own sessions | Return Visits missing PvP game dates, totalMatchmaking = 0 |
| `user_daily_plays` | No -- only own data | Daily play chart empty |
| `room_match_history` | No -- participants only | Room game history missing |
| `game_plays` | Yes | Works correctly |
| `user_sessions` | Yes | Works correctly (though often empty on mobile) |

### Fix

**Database Migration**: Add admin SELECT policies to the 3 tables missing them:

```sql
-- Allow admins to read all game_sessions
CREATE POLICY "Admins can view all game sessions"
  ON public.game_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to read all user_daily_plays
CREATE POLICY "Admins can view all daily plays"
  ON public.user_daily_plays FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to read all room_match_history
CREATE POLICY "Admins can view all room match history"
  ON public.room_match_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

**No code changes needed** -- the UserDetailModal.tsx code already queries these tables correctly. The data was simply being blocked by RLS.

### Expected Result After Fix
For the "fatima" user example (59 games across Feb 13-14):
- **Return Visits**: 2 (instead of 0)
- **Total Matchmaking**: 59 (instead of 0)
- **Time Spent**: Accurate from session data when available
- **Daily Plays chart**: Will show actual daily activity
- **Room History tab**: Will show actual room games

### Files Changed
| Change | Detail |
|--------|--------|
| Database migration | Add 3 RLS policies for admin read access |

