

## Fix: PostHog Not Showing User Emails/Names

### Root Cause

The `useIdentifyUser` hook in `PostHogProvider.tsx` has an "early identify" path (line 58-65) that fires before the profile is loaded. This path only sets `$email`, which for username-only signups is a meaningless `@mytrivia.local` pseudo-email. The `$name` property is only set in the "full identify" path, which requires `profile` to be loaded.

If the profile fetch is slow, fails, or the user navigates before it completes, PostHog never receives `$name` and falls back to showing the UUID.

Meanwhile, `user.user_metadata.nickname` (set during signup) is available immediately from the auth session but is never used.

### Fix

**File: `src/providers/PostHogProvider.tsx`**

Update the early identify path (lines 58-65) to also set `$name` using `user.user_metadata?.nickname`:

```
} else if (user && !profile && !initialIdentifyDoneRef.current) {
  const metaNickname = (user.user_metadata as any)?.nickname;
  posthog.identify(user.id, {
    $email: user.email ?? undefined,
    $name: metaNickname ?? undefined,
    user_type: "registered",
  });
  posthog.register({ user_type: "registered" });
  initialIdentifyDoneRef.current = true;
}
```

Also filter out pseudo-emails so PostHog doesn't store `@mytrivia.local` addresses as `$email`. In both identify paths, only set `$email` if it's a real email:

```
const isRealEmail = user.email && !user.email.endsWith('@mytrivia.local');
// ...
$email: isRealEmail ? user.email : undefined,
```

This ensures:
- `$name` is set immediately from auth metadata, even before profile loads
- Fake pseudo-emails are never sent to PostHog
- The full identify path still enriches with profile data when available

### Summary

| Change | Effect |
|--------|--------|
| Set `$name` from `user.user_metadata.nickname` in early identify | Users show by name immediately, no profile wait needed |
| Filter out `@mytrivia.local` pseudo-emails | PostHog stops receiving meaningless email values |

Single file change: `src/providers/PostHogProvider.tsx`

