

## Fix: Distinguish Registered vs Guest Users in PostHog

### Problem
All users appear as anonymous/guests in PostHog because:
1. Registered users are identified, but there's no `user_type` property to filter by
2. Guest users have zero person properties set — they're indistinguishable from any anonymous visitor

### Solution
Add a `user_type` person property to PostHog for both registered and guest users.

### Technical Details

**File: `src/providers/PostHogProvider.tsx`**

1. When a registered user is identified (line 44), add `user_type: "registered"` to the person properties
2. When no user is present (guest), call `posthog.register({ user_type: "guest" })` to attach a super property to all subsequent events — this way every pageview and event from a guest is tagged
3. On logout/reset (line 57), set `user_type` back to `"guest"`

This lets you filter and segment in PostHog by `user_type = "registered"` vs `user_type = "guest"`.

### File to Change
- `src/providers/PostHogProvider.tsx` — update `useIdentifyUser` hook

