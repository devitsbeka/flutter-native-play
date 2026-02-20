

## Fix: Race Condition Causing Registered Users to Appear as Guests

### Problem

On every app load, the `useIdentifyUser` hook runs immediately. At that point, `user` and `profile` are still `null` (auth is loading), so it hits the guest branch and calls:
```
posthog.setPersonProperties({ user_type: "guest" })
```

A moment later, auth resolves and `posthog.identify()` fires with `user_type: "registered"`. But PostHog has already stamped the anonymous person as "guest". During the identify/merge, properties can conflict or the "guest" value persists depending on timing.

### Solution

**Skip setting any person properties while auth is still loading.** Only set `user_type` once we know the actual auth state.

### Technical Changes

**File: `src/providers/PostHogProvider.tsx`**

1. Import `loading` from `useAuth()` alongside `user` and `profile`
2. Add an early return in `useIdentifyUser` when `loading` is `true` -- do nothing until auth state is resolved
3. This ensures `user_type: "guest"` is only set for users who are genuinely not logged in, not for users whose auth state hasn't loaded yet

```
function useIdentifyUser() {
  const { user, profile, loading } = useAuth();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't set any properties until auth state is resolved
    if (loading) return;

    if (user && profile && identifiedRef.current !== user.id) {
      posthog.identify(user.id, { ... user_type: "registered" });
      posthog.register({ user_type: "registered" });
      identifiedRef.current = user.id;
    } else if (!user && identifiedRef.current) {
      posthog.reset();
      posthog.register({ user_type: "guest" });
      posthog.setPersonProperties({ user_type: "guest" });
      identifiedRef.current = null;
    } else if (!user && !identifiedRef.current) {
      posthog.register({ user_type: "guest" });
      posthog.setPersonProperties({ user_type: "guest" });
    }
  }, [user, profile, loading]);
}
```

This single change prevents the false "guest" stamp from being applied before auth has a chance to resolve.

