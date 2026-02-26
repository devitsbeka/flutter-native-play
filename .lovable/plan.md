

# Modal Priority & Sequencing Fix

## Problem
Multiple modals compete for attention on app load:
1. **Welcome Onboarding** (spotlight tour for new users)
2. **Invite Friends Modal** (auto-shows for non-VIP logged-in users)
3. **Play Limit Modal** ("თამაშის ლიმიტი ამოწურულია" - chains from invite dismiss)
4. **Floating Gift Button** (appears after invite dismiss)

These can all appear simultaneously, overwhelming the user.

## Solution: Sequential Modal Priority System

Establish a strict priority order -- only one modal layer at a time:

1. **Welcome Onboarding** (highest priority) -- must complete/dismiss first
2. **Invite Friends / Play Limit modals** -- only after onboarding is done
3. **Floating Gift Button** -- only after invite modal dismissed

## Changes

### 1. `src/components/home/InviteFriendsModal.tsx` - Suppress auto-show during onboarding

Update `useInviteModalVisibility` to accept a `suppress` parameter. When the welcome onboarding is active, the invite modal will not auto-show. Once onboarding completes, the invite modal can appear.

```typescript
export function useInviteModalVisibility(isVip: boolean, vipLoading: boolean, suppress = false) {
  // ... existing code ...
  useEffect(() => {
    if (!user || vipLoading || isVip || suppress) return;
    // ... rest unchanged
  }, [user, isVip, vipLoading, suppress]);
}
```

### 2. `src/pages/Index.tsx` - Wire suppression based on onboarding state

- Pass `showWelcomeOnboarding` as the `suppress` flag to `useInviteModalVisibility`
- Also suppress `PlayLimitModal` auto-chaining while onboarding is active
- Ensure the `FloatingGiftButton` is hidden during onboarding

Key logic change:
```typescript
const { visible: inviteModalVisible, dismiss: dismissInvite, setVisible: setInviteModalVisible } = 
  useInviteModalVisibility(isVip, vipLoading, showWelcomeOnboarding);
```

For the invite dismiss -> PlayLimitModal chain, add a guard:
```typescript
onDismiss={() => {
  dismissInvite();
  setInviteDismissedThisSession(true);
  // Only show play limit modal if onboarding is not active
  if (!showWelcomeOnboarding) {
    setShowGuestMaxPlaysModal(true);
  }
}}
```

For the floating gift button, add onboarding check:
```typescript
{inviteDismissedThisSession && !isVip && !inviteModalVisible && !showWelcomeOnboarding ? (
  <FloatingGiftButton ... />
) : null}
```

### 3. `src/contexts/PlayGuardContext.tsx` - No changes needed

The PlayGuardContext only triggers modals on explicit play attempts (button clicks), not on page load, so it won't conflict.

## Summary of files to edit
- `src/components/home/InviteFriendsModal.tsx` -- add `suppress` param to hook
- `src/pages/Index.tsx` -- pass onboarding state as suppress flag, guard modal chains

