

## Fix: PostHog Users Showing as Guests

### Root Cause

In `src/providers/PostHogProvider.tsx`, the `useIdentifyUser` hook calls `posthog.setPersonProperties({ user_type: "guest" })` for unauthenticated users. This writes a **permanent person-level property** on the anonymous PostHog person record. When the user later signs in and `posthog.identify(userId)` runs, PostHog merges the anonymous person into the identified one -- but the "guest" person property can persist or conflict with the "registered" value set during identify, causing all users to appear as guests in the PostHog dashboard.

### Fix (single file change)

**File: `src/providers/PostHogProvider.tsx`**

1. **Remove `posthog.setPersonProperties({ user_type: "guest" })` from both guest branches** (lines 69 and 74)
   - `setPersonProperties` writes permanent server-side person properties
   - For guests, we only need `posthog.register()` which sets session-level super properties (attached to events, not the person record)

2. **Keep `posthog.register({ user_type: "guest" })` for event tagging** -- this correctly tags events as coming from a guest session without polluting the person record

3. **No changes to the identify branches** -- `posthog.identify(userId, { user_type: "registered", ... })` already correctly sets person properties during identification

### Before vs After

**Before (broken):**
- Guest branch: `register("guest")` + `setPersonProperties("guest")` -- permanently marks person as guest
- Then identify fires: `identify(userId, { user_type: "registered" })` -- but merge may not override the earlier person property

**After (fixed):**
- Guest branch: only `register("guest")` -- session-level, doesn't touch person record
- identify fires: `identify(userId, { user_type: "registered" })` -- cleanly sets person property on first identification

### Technical Details

Lines to change in `src/providers/PostHogProvider.tsx`:

- Line 69: Remove `posthog.setPersonProperties({ user_type: "guest" });`
- Line 74: Remove `posthog.setPersonProperties({ user_type: "guest" });`

Two lines deleted, no new code added. Existing identified users in PostHog will be correctly updated on their next visit.

