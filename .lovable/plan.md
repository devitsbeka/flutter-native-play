
# Fix: Don't Show Invite Friends Modal Until Free Games Are Exhausted

## Problem
The `useInviteModalVisibility` hook in `InviteFriendsModal.tsx` auto-shows for ANY non-VIP logged-in user on page load. It only suppresses during onboarding (`suppress` flag), but it doesn't check if the user still has free games remaining. This causes:
1. New users see both onboarding spotlight AND invite modal simultaneously (as shown in screenshot)
2. Users with 5/5 free games see the invite modal before they've even played

## Desired Behavior
1. Onboarding modals show first for new users (no other modals)
2. Invite Friends modal only appears AFTER all 5 free games are used
3. Play Limit (PRO upgrade) modal only appears after invite modal is dismissed AND games are exhausted

## Root Cause
In `useInviteModalVisibility` (line 16-44 of `InviteFriendsModal.tsx`), there's no check for `freeGamesExhausted`. It shows for all non-VIP users immediately.

## Fix

### File: `src/components/home/InviteFriendsModal.tsx`
- Add `freeGamesExhausted` parameter to `useInviteModalVisibility`
- Only set `visible(true)` when `freeGamesExhausted` is true
- Updated signature: `useInviteModalVisibility(isVip, vipLoading, suppress, freeGamesExhausted)`

### File: `src/pages/Index.tsx`
- Pass `freeGamesExhausted` to `useInviteModalVisibility`:
  ```
  useInviteModalVisibility(isVip, vipLoading, showWelcomeOnboarding, freeGamesExhausted)
  ```

## Technical Details

**`src/components/home/InviteFriendsModal.tsx` - useInviteModalVisibility hook:**
```typescript
export function useInviteModalVisibility(
  isVip: boolean, 
  vipLoading: boolean, 
  suppress = false, 
  freeGamesExhausted = false
) {
  // ... existing state ...
  useEffect(() => {
    // Add freeGamesExhausted check - only show when games are used up
    if (!user || vipLoading || isVip || suppress || !freeGamesExhausted) return;
    // ... rest of checks ...
    setVisible(true);
  }, [user, isVip, vipLoading, suppress, freeGamesExhausted]);
}
```

**`src/pages/Index.tsx` - Pass the new parameter:**
```typescript
const { visible: inviteModalVisible, dismiss: dismissInvite, setVisible: setInviteModalVisible } = 
  useInviteModalVisibility(isVip, vipLoading, showWelcomeOnboarding, freeGamesExhausted);
```

## Modal Priority Sequence (after fix)
1. Welcome Onboarding (new users only, highest priority)
2. Invite Friends (only after all 5 free games exhausted, suppressed during onboarding)
3. Play Limit / PRO upgrade (only after invite dismissed AND games exhausted)
