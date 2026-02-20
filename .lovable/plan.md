

## Investigation: PostHog User Identification

### Current State -- What's Already Working

Your code **IS** calling `posthog.identify()` correctly for registered users. Here's the flow:

1. **Registered user with loaded profile** (line 44-60): Calls `posthog.identify(user.id, { $name: profile.nickname, $email: ..., user_type: "registered" })` -- this works perfectly.
2. **Registered user before profile loads** (line 61-70): Calls early identify with `user.user_metadata.nickname` -- but this may be `undefined` for Google OAuth users (their metadata uses `name`/`full_name`, not `nickname`).
3. **Guest users** (line 71-78): Only sets `user_type: "guest"` as a super property. They remain **completely anonymous** in PostHog with random IDs.

### The Problem

**Guests are never identified.** They show as random PostHog anonymous IDs with no name, email, or any distinguishing info. You cannot tell who they are in PostHog because they literally have no identity in your system.

### Fix: Two Issues to Address

**Issue 1: Early identify missing name for Google/Apple users**

The early identify (before profile loads) reads `user.user_metadata.nickname`, but Google OAuth stores the name as `full_name` or `name`. Fix: fall back to those fields.

**Issue 2: Guests have zero identification**

Since guests have no account, we cannot `identify()` them. But we CAN set **person properties** so they show up with useful labels in PostHog instead of random UUIDs.

### Solution

**File: `src/providers/PostHogProvider.tsx`**

**Change 1 -- Fix early identify name resolution (line 63):**
```typescript
// Before:
const metaNickname = (user.user_metadata as any)?.nickname;

// After:
const meta = user.user_metadata as any;
const metaNickname = meta?.nickname || meta?.full_name || meta?.name;
```
This ensures Google/Apple OAuth users get their name set immediately, even before the profile DB query completes.

**Change 2 -- Give guests a descriptive label (line 76-78):**
```typescript
// Before:
} else if (!user && !identifiedRef.current) {
  posthog.register({ user_type: "guest" });
}

// After:
} else if (!user && !identifiedRef.current) {
  posthog.register({ user_type: "guest" });
  // Set person properties so guests show a readable label in PostHog
  // instead of a random UUID
  posthog.setPersonProperties({
    $name: "Guest",
    user_type: "guest",
  });
}
```

Also update the reset branch (line 71-75) similarly:
```typescript
} else if (!user && (identifiedRef.current || initialIdentifyDoneRef.current)) {
  posthog.reset();
  posthog.register({ user_type: "guest" });
  posthog.setPersonProperties({
    $name: "Guest",
    user_type: "guest",
  });
  identifiedRef.current = null;
  initialIdentifyDoneRef.current = false;
}
```

### What This Achieves

| User Type | Before | After |
|-----------|--------|-------|
| Registered (username signup) | Shows as nickname | No change (already works) |
| Registered (Google OAuth) | May show as UUID until profile loads | Shows name immediately from OAuth metadata |
| Guest | Random UUID, no label | Shows as "Guest" with `user_type: "guest"` property |

### How to Filter in PostHog

After this change, in PostHog you can:
- **See all registered users**: Filter by `user_type = registered` -- they'll show nicknames/emails
- **See all guests**: Filter by `user_type = guest` -- they'll show as "Guest"
- **Distinguish guest vs registered**: The `user_type` property is set on every event via `posthog.register()`

### Files Changed

| File | Change |
|------|--------|
| `src/providers/PostHogProvider.tsx` | Fix OAuth name fallback, add guest person properties |

