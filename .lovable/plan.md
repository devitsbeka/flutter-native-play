

## Fix User Deep Dive: Correct Category Data and Improve Session Stats

### Problems Identified

1. **Categories never show up (Fav Category = "---")**: The code joins `game_plays.category_id` (text, e.g. `"georgian_cuisine"`) with `categories.id` (UUID). This join always fails. It should match on `categories.category_id` (text field).

2. **Time Spent and Avg Session = 0s**: The `user_sessions` table has `duration_seconds = null` for most records because `endSession()` fires on `beforeunload`/`visibilitychange` which are unreliable in mobile browsers. Sessions get created but never properly closed.

3. **Return Visits = 0**: Same root cause -- `user_sessions` has very few entries for authenticated users (mostly guest sessions).

4. **Note on Sofio T**: Her 3 games and 0% win rate are actually correct -- she played 3 matchmaking games and lost all 3.

### Changes

**File: `src/components/admin/analytics/UserDetailModal.tsx`**

1. **Fix category join** (affects Overview + Categories tabs):
   - Change all `categories.find(c => c.id === catId)` to `categories.find(c => c.category_id === catId)`
   - This fixes: Fav Category display, Categories tab breakdown, and category names in Game History

2. **Compute Time Spent from game data when sessions are missing**:
   - For `totalTimeSeconds`: if `user_sessions` data is empty/zero, estimate from `game_sessions` and `game_plays` counts (avg ~2min per game as fallback)
   - For `uniqueDays` (Return Visits): also count distinct dates from `game_sessions.created_at` and `game_plays.played_at` to capture activity even without session tracking

3. **Fix Avg Session**: When session duration data is null, calculate from session_start to session_end timestamps directly, or from the last heartbeat

**File: `src/hooks/useSessionTracker.ts`**

4. **Improve session duration reliability**:
   - Add a periodic heartbeat (every 30s) that updates `duration_seconds` on the active session, so even if `endSession` never fires, we still have approximate duration data
   - Use `navigator.sendBeacon` for the `beforeunload` handler to improve reliability on mobile

### Result
- Categories will display correctly in Overview (Fav Category) and Categories tab
- Time Spent will show real data from either sessions or game activity
- Return Visits will count days with any activity, not just sessions
- Future sessions will have reliable duration data via heartbeat
