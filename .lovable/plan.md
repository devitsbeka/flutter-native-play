

# Fix: Welcome Onboarding Not Showing for New Accounts

## Root Cause

The welcome onboarding trigger in `Index.tsx` uses a **5-minute window** based on `profile.created_at`. If the signup + avatar creation process takes longer than 5 minutes, the `else` branch fires and **permanently marks the onboarding as "seen"** — so the user never gets the feature tour.

```typescript
// Current broken logic:
const createdAt = new Date(profile.created_at).getTime();
const fiveMinAgo = Date.now() - 5 * 60 * 1000;
if (createdAt > fiveMinAgo) {
  // show onboarding
} else {
  // PROBLEM: permanently marks as seen for any account older than 5 min
  localStorage.setItem("mytrivia_welcome_onboarding_seen", "true");
}
```

## Fix

### 1. `src/pages/Index.tsx` — Use a flag-based approach instead of time window

Replace the 5-minute time check with a more reliable approach:
- Use a **new localStorage flag** `mytrivia_is_new_signup` that gets set during the signup flow
- When the user lands on Index after signup with this flag present AND `welcome_onboarding_seen` is not set, show the onboarding
- Remove the time-based check entirely
- Also keep a fallback: if account is less than **30 minutes** old (instead of 5 min) and flag isn't set, still show onboarding

### 2. `src/contexts/OnboardingContext.tsx` — Set new-signup flag on complete

When `completeOnboarding()` is called (signup flow finishes), set `mytrivia_is_new_signup` in localStorage so the Index page knows to trigger the welcome tour.

### 3. Verify modal sequencing remains correct

The existing suppression logic (from previous fix) will continue to work:
- Welcome Onboarding shows first (highest priority)
- Invite Friends / Play Limit modals are suppressed while onboarding is active
- Gift button hidden during onboarding

## Technical Details

**File: `src/contexts/OnboardingContext.tsx`**
- In `completeOnboarding()`, add: `localStorage.setItem("mytrivia_is_new_signup", "true")`

**File: `src/pages/Index.tsx`**
- Replace the time-based check with:
  - Check if `mytrivia_is_new_signup` flag exists AND `welcome_onboarding_seen` is not set
  - If so, show onboarding and clear the `is_new_signup` flag
  - Fallback: also trigger if account is less than 30 minutes old (wider window)
  - Remove the `else` branch that permanently marks old accounts as "seen" — instead just do nothing for old accounts without the flag

