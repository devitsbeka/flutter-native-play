

## Fix: Registered Users Appearing as "Guest" in PostHog

### Problem
PostHog shows active sessions as "Guest" while the admin dashboard correctly shows them as registered users (Kato, makom1976, Player5057, etc.). The same people appear in both systems but PostHog labels them wrong.

### Root Cause
When Supabase refreshes authentication tokens (which happens periodically), the auth state briefly flickers to "no user" before resolving back to the logged-in user. During this flicker:

1. `posthog.reset()` fires, destroying the identified person profile
2. A new anonymous "Guest" person is created
3. When auth resolves moments later, `identify` runs but the damage is done -- the session is now split

### Solution

**File: `src/providers/PostHogProvider.tsx`**

1. **Remove `posthog.reset()` from the auth flicker path** -- Instead of immediately resetting when `user` becomes null, add a delay (e.g., 2-3 seconds) to allow token refreshes to complete. Only reset if the user is still null after the delay.

2. **Stop eagerly labeling unknown state as "Guest"** -- Remove the `setPersonProperties({ name: "Guest" })` call from the initial/unknown state branch. Only label as "Guest" after confirming a true sign-out (after the delay).

3. **Guard against re-identification loops** -- Keep `identifiedRef` but skip the reset path if the user was previously identified within the last few seconds.

### Technical Changes

```
useIdentifyUser() effect:
- When user becomes null AND was previously identified:
  - Start a 3-second timer instead of calling posthog.reset() immediately
  - If user comes back (token refresh), cancel the timer -- no reset
  - If user stays null after 3s, THEN call posthog.reset() and label as Guest
  
- When user is null and was never identified (true guest):
  - Only set user_type super property via posthog.register()
  - Do NOT call setPersonProperties with "Guest" name (this overwrites identified users during race conditions)
  - The bootstrap identity from localStorage will handle returning users
```

### What This Fixes
- Token refresh no longer destroys the identified person
- Registered users will retain their real names (Kato, Eka K., etc.) in PostHog
- True guests (never logged in) will still be tracked correctly
- The bootstrap identity (line 36-59) will continue working as the first line of defense for returning users

