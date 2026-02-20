

## Fix: PostHog Users Showing as UUIDs Instead of Names

### Root Cause

The `posthog-js` SDK (v1.343+) defaults `person_profiles` to `'identified_only'`. This means:

1. When the page loads, PostHog starts recording with an **anonymous** distinct ID
2. The auth state is still loading, so `identify()` hasn't fired yet
3. The session recording gets tagged to the anonymous profile
4. Even after `identify()` fires, the session recording display may not update properly because the initial anonymous events didn't create a person profile

### Fix

**File: `src/providers/PostHogProvider.tsx`** (line 11-17)

Add `person_profiles: 'always'` to the `posthog.init()` configuration:

```
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
  autocapture: true,
  persistence: "localStorage+cookie",
  person_profiles: "always",       // <-- ADD THIS
});
```

### What this changes

| Before | After |
|--------|-------|
| Person profiles created only on `identify()` call | Person profiles created for every visitor from the start |
| Session recordings tagged to anonymous IDs before auth resolves | All recordings properly linked to person profiles |
| Users show as UUIDs in recordings list | Users show by `$name` / nickname once `identify()` fires |

### Trade-off

Setting `person_profiles: 'always'` means PostHog processes person profiles for all events (including anonymous/guest ones), which can be up to 4x more expensive per event compared to `'identified_only'`. However, this is necessary to ensure session recordings are properly associated with identified users.

### Single file change
- `src/providers/PostHogProvider.tsx` -- add one config line

