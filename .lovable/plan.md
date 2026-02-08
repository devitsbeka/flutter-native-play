

## Fix: Stop TV Screen from Refreshing and Changing Codes

### Problem

The TV pairing screen (`/tv`) automatically refreshes and generates a new code because of the idle timeout mechanism. When the `phase` stays the same for 60 seconds (e.g., while waiting on the pairing screen), the `useIdleTimeout` hook fires, calls `leaveSession()`, navigates to `/tv`, and creates a brand new session -- resulting in a different 4-digit code appearing on screen.

This is disruptive because:
- A TV showing the pairing screen needs to keep its code stable so players can join at any time
- The pairing and lobby screens are inherently "idle" -- the phase doesn't change until players join and the host starts

### Solution

Remove the idle timeout entirely from `TVDisplay.tsx`. The TV screen should keep its session and code indefinitely. The pairing screen is meant to stay up and wait for players -- there's no reason to auto-reset.

### Technical Changes

**File: `src/pages/TVDisplay.tsx`**

- Remove the `useIdleTimeout` call (lines 42-47) that watches `phase` and triggers `leaveSession()` + navigation
- Remove the unused `useIdleTimeout` import
- Remove `leaveSession` from the destructured `useTVGame()` values (if no longer used elsewhere in the file)

This is a small, surgical change: just delete the idle timeout hook and its import. Everything else stays the same -- the session creation, subscription setup, and phase rendering all remain intact.

### What This Fixes

- TV pairing screen keeps showing the same 4-digit code without resetting
- No more unexpected code changes while waiting for players
- The session stays alive as long as the TV page is open

### Files Changed
- `src/pages/TVDisplay.tsx` -- remove idle timeout hook and related import

