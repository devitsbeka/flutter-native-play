
# Fix: PlayLimitModal Showing with Free Games + Onboarding Buttons Not Clickable

## Issue 1: PlayLimitModal appears even when user has 5/5 free games

**Root cause**: When the InviteFriendsModal is dismissed, it unconditionally chains to `setShowGuestMaxPlaysModal(true)` (which renders the PlayLimitModal). There is no check for whether the user actually has exhausted their free plays.

**Fix in `src/pages/Index.tsx`**:
- Add a `canPlay` check before showing the PlayLimitModal on invite dismiss
- Only show PlayLimitModal if the user has actually exhausted free games (`freeGamesExhausted` or `!canPlay`)

```typescript
// Before (broken):
onDismiss={() => {
  dismissInvite();
  setInviteDismissedThisSession(true);
  if (!showWelcomeOnboarding) {
    setShowGuestMaxPlaysModal(true); // Always shows!
  }
}}

// After (fixed):
onDismiss={() => {
  dismissInvite();
  setInviteDismissedThisSession(true);
  if (!showWelcomeOnboarding && freeGamesExhausted && !isVip) {
    setShowGuestMaxPlaysModal(true);
  }
}}
```

Also need to check where `freeGamesExhausted` comes from -- it's returned by `usePlayLimit()` which is already used in Index.tsx.

## Issue 2: Onboarding "შემდეგი" (Next) button not clickable

**Root cause**: In `WelcomeOnboardingOverlay.tsx`, the full-screen SVG mask (line 280) has `onClick={handleSkip}` and sits at `z-index: 10000`. The tooltip card is at `z-index: 10001` but doesn't explicitly set `pointer-events: auto`, so click events on buttons may be intercepted by the SVG underneath due to event bubbling/overlap.

**Fix in `src/components/onboarding/WelcomeOnboardingOverlay.tsx`**:
- Add `pointer-events-none` to the SVG element
- Create a separate invisible click-catcher div behind the tooltip (but above the SVG) for the skip-on-backdrop-click behavior
- Ensure the tooltip div explicitly has `pointer-events: auto` so buttons are clickable

```text
Current structure:
  [SVG mask with onClick={handleSkip}]  z-index: 10000 (catches ALL clicks)
  [Tooltip with buttons]                z-index: 10001 (buttons blocked)

Fixed structure:
  [SVG mask, pointer-events: none]      (visual only)
  [Click-catcher div onClick={handleSkip}]  (backdrop clicks only)
  [Tooltip, pointer-events: auto]       z-index: 10001 (buttons work)
```

## Files to edit
1. **`src/pages/Index.tsx`** -- Add `freeGamesExhausted` and `!isVip` guard to InviteFriendsModal dismiss handler
2. **`src/components/onboarding/WelcomeOnboardingOverlay.tsx`** -- Fix pointer events so tooltip buttons are clickable
