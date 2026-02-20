

## Fix: PostHog Still Shows Registered Users as Guests

### Root Cause

There is a gap in the identification logic. After signup, the auth state resolves in two steps:

1. `user` becomes available (auth session established)
2. `profile` loads shortly after (created by a database trigger, then fetched)

The current code requires **both** `user` AND `profile` to be non-null before calling `posthog.identify()`. If `profile` is null (due to trigger delay or fetch failure), **none of the branches execute** -- the user is never identified and stays as "guest" in PostHog.

```
Step 1: loading=false, user=set, profile=null --> NO BRANCH MATCHES (bug!)
Step 2: profile loads --> identify fires (but too late, events already sent as guest)
```

Additionally, `trackSignupCompleted()` fires immediately after signup (in Auth.tsx, Index.tsx, etc.), which sends a `signup_completed` event BEFORE `posthog.identify()` runs. This event gets attributed to the anonymous/guest person.

### Changes

**File: `src/providers/PostHogProvider.tsx`**

1. Add a new branch: when `user` exists but `profile` is still null, call `posthog.identify(user.id)` immediately with just the user ID and email -- don't wait for the full profile. This ensures the anonymous person gets merged with the identified person right away.

2. When `profile` later arrives (the effect re-runs because `profile` is in the dependency array), the existing `user && profile` branch fires and updates all person properties (nickname, coins, etc.).

3. Use a ref to track whether we've done the initial identify (without profile) so we don't skip the full identify when profile loads.

Updated logic:
```
if (user && profile && not yet fully identified)
   --> identify with all properties, mark as fully identified
else if (user && !profile && not yet initially identified)
   --> identify with just user.id + email + user_type: "registered"
else if (!user && was identified)
   --> reset, set guest
else if (!user && never identified)
   --> set guest
```

### Technical Detail

- The key insight is that `posthog.identify()` can be called multiple times with the same ID -- subsequent calls just update person properties. So calling it first with minimal data, then again with full profile data, works correctly.
- This also ensures that `trackSignupCompleted()` events (which fire right after signup) get correctly attributed to the identified person rather than an anonymous guest.
