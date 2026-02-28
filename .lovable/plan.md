
## Google and Apple Sign-In Issues - Analysis and Fixes

### Issues Found

**Issue 1: AuthRequiredModal uses wrong Apple Sign-In method**
In `AuthRequiredModal.tsx` (line 176), Apple sign-in calls `signInWithApple()` from `useAuth` context. That function (in `AuthContext.tsx`) uses the **native Capacitor** `@capacitor-community/apple-sign-in` plugin, which only works on iOS. On the web, it will always fail with an error since the native plugin is not available.

Meanwhile, the main `Auth.tsx` page correctly uses `lovable.auth.signInWithOAuth("apple")` for web.

**Issue 2: AuthRequiredModal Google redirect_uri includes returnToPath**
In `AuthRequiredModal.tsx` (line 164), the Google sign-in passes:
```
redirect_uri: window.location.origin + (returnToPath || "/")
```
This creates URLs like `https://mytrivia.io/leaderboard` as the OAuth redirect URI. OAuth requires the redirect URI to exactly match what's configured. It should be just `window.location.origin` (the path can be stored in localStorage for post-login navigation).

**Issue 3: Auth.tsx inconsistent Apple vs Google handling**
- Google: calls `signInWithGoogle()` from context, which internally calls `lovable.auth.signInWithOAuth("google")` - correct
- Apple: calls `lovable.auth.signInWithOAuth("apple")` directly - correct for web

The native Capacitor path in `signInWithApple()` in AuthContext should only be used when running on iOS natively.

### Plan

#### 1. Fix `AuthRequiredModal.tsx`
- **Apple**: Replace `signInWithApple()` from useAuth with `lovable.auth.signInWithOAuth("apple")` for web compatibility, matching the Auth.tsx pattern
- **Google**: Change `redirect_uri` from `window.location.origin + (returnToPath || "/")` to just `window.location.origin`. Store `returnToPath` in `localStorage` (as `authReturnTo`) before initiating OAuth, matching the Auth.tsx pattern

#### 2. Fix `AuthContext.tsx` - `signInWithApple`
Add platform detection: use native Capacitor Apple Sign-In only on iOS, fall back to `lovable.auth.signInWithOAuth("apple")` on web. This ensures any code calling `signInWithApple()` works on both platforms.

#### 3. Fix `AuthContext.tsx` - `signInWithGoogle`
The current implementation looks correct (uses lovable module). No changes needed.

### Technical Details

**Files to change:**

| File | Change |
|------|--------|
| `src/components/shared/AuthRequiredModal.tsx` | Fix Apple to use `lovable.auth.signInWithOAuth("apple")`, fix Google redirect_uri, store returnToPath in localStorage |
| `src/contexts/AuthContext.tsx` | Add platform check in `signInWithApple` - use native only on iOS, use `lovable.auth.signInWithOAuth("apple")` on web |

**AuthContext signInWithApple fix:**
```text
Before: Always tries native Capacitor plugin (fails on web)
After:  Check Capacitor.getPlatform() === 'ios' -> native, otherwise -> lovable OAuth
```

**AuthRequiredModal Google fix:**
```text
Before: redirect_uri: window.location.origin + returnToPath
After:  redirect_uri: window.location.origin
        + localStorage.setItem('authReturnTo', returnToPath) before OAuth
```
