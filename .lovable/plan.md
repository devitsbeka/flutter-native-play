

## Fix PostHog User Identification -- New Approach

### Root Cause

The problem is a **race condition**:

1. `posthog.init()` runs at module level (immediately)
2. `usePageviewTracker` fires a `$pageview` event on first render
3. At this point, auth is still `loading: true`, so `useIdentifyUser` skips everything
4. PostHog creates the person with an **anonymous UUID**
5. Later, when auth resolves, `posthog.identify()` fires -- but PostHog's live view may not immediately reflect the merged identity, and the person was already created anonymously

`posthog.setPersonProperties()` and late `identify()` calls don't reliably update the display name in PostHog's live session view because the person was already materialized as anonymous.

### Solution: Bootstrap Identity at Init Time

Use PostHog's `bootstrap` option during `posthog.init()` to pre-set the user's identity **before any events fire**. We can read the Supabase session from localStorage synchronously to get the user ID, and read `mytrivia_last_user` for the display name.

### Changes

**File: `src/providers/PostHogProvider.tsx`**

**Step 1 -- Read cached identity before `posthog.init()`:**
```typescript
// Read Supabase session from localStorage to bootstrap identity
function getBootstrapIdentity() {
  try {
    // Supabase stores session in localStorage
    const storageKey = 'sb-sqwpzezkhpqkdyltvsim-auth-token';
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const userId = parsed?.user?.id;
    if (!userId) return null;

    // Get display name from cached user data
    const lastUser = localStorage.getItem('mytrivia_last_user');
    const lastUserData = lastUser ? JSON.parse(lastUser) : null;
    const meta = parsed?.user?.user_metadata;
    const displayName = lastUserData?.nickname 
      || meta?.nickname || meta?.full_name || meta?.name;

    return { userId, displayName };
  } catch {
    return null;
  }
}
```

**Step 2 -- Pass bootstrap to `posthog.init()`:**
```typescript
const bootstrapIdentity = getBootstrapIdentity();

posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
  autocapture: true,
  persistence: "localStorage+cookie",
  person_profiles: "always",
  bootstrap: bootstrapIdentity ? {
    distinctID: bootstrapIdentity.userId,
    isIdentifiedID: true,
  } : undefined,
});

// If bootstrapped, immediately set person properties
if (bootstrapIdentity) {
  posthog.setPersonProperties({
    $name: bootstrapIdentity.displayName,
    user_type: "registered",
  });
}
```

This ensures that the **very first event** PostHog captures (including `$pageview`) already has the correct user ID and display name -- no race condition possible.

**Step 3 -- Keep existing `useIdentifyUser` hook as-is:**
The hook still handles the full identify with all profile properties when auth resolves, and handles the guest/logout cases. The bootstrap just ensures no anonymous person is created in the gap.

### What This Fixes

| Scenario | Before | After |
|----------|--------|-------|
| Returning registered user | First events go out as anonymous UUID, then merge | First event already uses real user ID + name |
| Guest user | Shows as anonymous UUID | Shows as anonymous UUID (expected -- they have no identity) |
| OAuth user | May show UUID until profile loads | Shows name immediately from bootstrap |

### Why Previous Fix Didn't Work

`posthog.setPersonProperties()` and late `identify()` calls set properties on the person, but PostHog's live view and persons list display the identity that was set when the person was **first created**. By bootstrapping at init time, the person is created with the correct identity from the start.

### Files Changed

| File | Change |
|------|--------|
| `src/providers/PostHogProvider.tsx` | Add `getBootstrapIdentity()` function, pass `bootstrap` option to `posthog.init()`, set initial person properties |
