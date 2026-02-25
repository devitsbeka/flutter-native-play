

## Fix Welcome Onboarding Not Showing + Add Admin Preview Route

### Problem
The welcome onboarding modal never appears because the trigger condition (`hasCompletedOnboarding`) only becomes `true` when a user goes through the `SignupOnboardingModal` flow. Users who sign up via Google, Apple, or the standard auth page bypass this entirely. Even users who do use the signup modal may miss it due to the avatar modal opening immediately after.

### Solution

**1. Fix the trigger logic in `src/pages/Index.tsx`**

Replace the `hasCompletedOnboarding` check with a more reliable approach:
- Instead of depending on `OnboardingContext.hasCompletedOnboarding`, check if the user's `profile.created_at` is recent (within the last 5 minutes) AND the localStorage key `mytrivia_welcome_onboarding_seen` is NOT set.
- This works for ALL signup paths (username, Google, Apple, guest conversion).
- Remove the dependency on `useOnboarding().hasCompletedOnboarding` for this feature.

```ts
useEffect(() => {
  if (
    user &&
    profile?.created_at &&
    !localStorage.getItem("mytrivia_welcome_onboarding_seen")
  ) {
    // Show for accounts created in the last 5 minutes
    const createdAt = new Date(profile.created_at).getTime();
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    if (createdAt > fiveMinAgo) {
      const timer = setTimeout(() => setShowWelcomeOnboarding(true), 800);
      return () => clearTimeout(timer);
    } else {
      // Old account, mark as seen so we never check again
      localStorage.setItem("mytrivia_welcome_onboarding_seen", "true");
    }
  }
}, [user, profile]);
```

**2. Add `/onboarding` admin preview route**

Update `src/App.tsx`:
- Add a new route `/onboarding` pointing to a new preview page.

Create `src/pages/OnboardingWelcomePreview.tsx`:
- A simple page that renders `WelcomeOnboardingModal` with `isOpen={true}`.
- Includes a "Reset and Reopen" button to clear the localStorage key and re-trigger it.
- Wrapped in `AdminRoute` so only admins can access it.

### Files to Edit
1. `src/pages/Index.tsx` -- Fix the trigger useEffect to use `profile.created_at` instead of `hasCompletedOnboarding`
2. `src/pages/OnboardingWelcomePreview.tsx` -- New admin preview page
3. `src/App.tsx` -- Add `/onboarding` route

