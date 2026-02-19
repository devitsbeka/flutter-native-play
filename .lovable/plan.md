

## Fix: Make Leaderboard List Open Instantly

### Problem
When you click "ნახე რეიტინგი", the bottom sheet opens but shows loading skeletons for 2-3 seconds while two sequential database queries run:
1. First: fetch user's league tier (userLeagueData)
2. Then: fetch the actual leaderboard for that tier

### Root Cause
- The two queries run sequentially (leaderboard waits for tier to resolve)
- There is a `useLeaderboardPrefetch` hook that was built for this exact purpose, but it is never actually called anywhere in the app
- No data is preloaded before the user clicks the button

### Solution: Prefetch leaderboard data on page load

**File: `src/pages/Leaderboards.tsx`**

1. Import `useLeaderboardPrefetch` and call `prefetchLeaderboard(userTier)` as soon as the page mounts and `userTier` is known. This way data is already cached when the user clicks the button.

2. Add a secondary prefetch trigger: when `userTier` changes (e.g., after league data loads), immediately prefetch that tier's leaderboard in the background.

This means by the time the user taps "ნახე რეიტინგი", the data is already in the React Query cache and the list renders instantly with zero loading.

### Technical Details

- Add `useEffect` that calls `prefetchLeaderboard(userTier)` when `userTier` becomes available
- The prefetch function already has cache-check logic (won't re-fetch if data exists)
- The leaderboard query already uses `placeholderData: previousData`, so cached data will show immediately
- No database or API changes needed -- just wiring up existing code that was never connected

### Files to Change
- **`src/pages/Leaderboards.tsx`**: Import and call `useLeaderboardPrefetch`, add `useEffect` to prefetch on mount

