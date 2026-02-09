

## Make User Analytics Update in Real-Time

### Problem
The User Analytics page only fetches data once when the page loads. New users who sign up while you're viewing the dashboard won't appear until you manually refresh the browser. This is why you see users in PostHog but not here.

### Solution
Add auto-refresh polling and a manual refresh button so the dashboard stays current.

### Changes

**File: `src/pages/admin/UserAnalytics.tsx`**

1. Add a polling interval (every 30 seconds) that re-fetches all user data automatically
2. Add a visible "Refresh" button next to the header so you can manually trigger a data reload anytime
3. Show a "Last updated: X seconds ago" indicator so you know how fresh the data is

**File: `src/lib/excludedUsers.ts`**

4. Remove `Giga` (`7d75dfbb-...`) from the mascot list -- this appears to be a real user with 9 games played and 11,415 coins. Verify if any other IDs in the mascot list are actually real users that should be shown.

### Technical Details

- Polling uses `setInterval` with cleanup on unmount
- The refresh button calls the existing `fetchAllUsers` function
- A timestamp state tracks the last successful fetch for the "last updated" display
- No database changes needed

