
## Show Floating Gift Button After Invite Modal Dismissed

When the user clicks "მოგვიანებით" (Later) on the invite modal, show a floating circular gift button on the main page (like `FloatingGiftButton`) so they can easily reopen the invite modal.

### What Changes

**1. Track dismissed state and show floating button (`src/pages/Index.tsx`)**
- Add a state `inviteDismissedThisSession` that becomes `true` when the user dismisses the invite modal
- Show `FloatingGiftButton` (with `AnimatePresence`) when:
  - `inviteDismissedThisSession === true`
  - `freeGamesExhausted === true`
  - `!isVip`
  - invite modal is NOT currently open
- Clicking the floating button reopens the `InviteFriendsModal`

**2. Update the dismiss handler (`src/pages/Index.tsx`, around line 718-721)**
- In the `onDismiss` callback, set `inviteDismissedThisSession = true`
- Keep the existing `dismissInvite()` and `setShowGuestMaxPlaysModal(true)` calls

**3. Render the FloatingGiftButton (`src/pages/Index.tsx`)**
- Import `FloatingGiftButton` from `@/components/shared/FloatingGiftButton`
- Render it conditionally with `AnimatePresence` near the other modals:
```
{inviteDismissedThisSession && freeGamesExhausted && !isVip && !inviteModalVisible && (
  <FloatingGiftButton onClick={() => setInviteModalVisible(true)} />
)}
```

### Files changed

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add `inviteDismissedThisSession` state, import `FloatingGiftButton`, render it conditionally, update dismiss handler |

The existing `FloatingGiftButton` component already has the perfect design with:
- Purple/green gradient circle
- Bouncing gift icon animation
- Pulsing glow ring
- Red "1" notification badge

No changes needed to the `FloatingGiftButton` component itself -- it matches what was previously shown.
