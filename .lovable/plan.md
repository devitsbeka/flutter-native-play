

## Remove Old Free PRO Gift Modals -- Keep Only Invite Friends Modal

### What's Changing
The app currently has three ways users get free 10-day PRO without inviting anyone. These need to be removed so the only path to free PRO is through the invite-a-friend flow.

### Modals to Remove

1. **ProGiftModal** (the "10 day PRO gift after 5 games" modal)
   - File: `src/pages/Index.tsx`
   - Remove the import of `ProGiftModal` and `useProGiftEligibility` from `ProGiftBanner`
   - Remove all related state variables (`proGiftModalOpen`, `proGiftDismissed`, `proGiftClaimed`, `proGiftEligible`)
   - Remove the auto-open `useEffect` (lines 251-256)
   - Remove the `<ProGiftModal>` JSX (lines 692-698)
   - Remove the floating gift button tied to it (lines 714-721)

2. **BetaGiftModal** (the "returning user" gift modal)
   - File: `src/contexts/PlayerProfileContext.tsx`
   - Remove the import of `BetaGiftModal` and `useReturnGiftEligibility`
   - Remove the import of `FloatingGiftButton`
   - Remove all related state and logic: `isEligible`, `giftModalOpen`, `pendingGift`, `giftClaimed`, handlers, auto-open effect
   - Remove the `<BetaGiftModal>` and `<FloatingGiftButton>` from the JSX
   - Keep the `PlayerProfileModal` and VIP auto-grant logic untouched

### What Stays
- **`InviteFriendsModal`** in `Index.tsx` -- the new invite-to-earn-PRO modal (already implemented)
- **`FriendJoinedModal`** in `Index.tsx` -- the congratulations modal when a friend joins
- The referral flow in `Auth.tsx` that processes the reward

### Technical Details

**File: `src/pages/Index.tsx`**
- Remove import: `import { ProGiftModal, useProGiftEligibility } from "@/components/home/ProGiftBanner"`
- Remove import: `import { FloatingGiftButton } from "@/components/shared/FloatingGiftButton"`
- Remove state: `proGiftEligible`, `proGiftModalOpen`, `proGiftDismissed`, `proGiftClaimed`
- Remove useEffect for auto-opening ProGiftModal
- Remove `<ProGiftModal>` component from JSX
- Remove `<AnimatePresence>` block with `<FloatingGiftButton>`

**File: `src/contexts/PlayerProfileContext.tsx`**
- Remove imports: `BetaGiftModal`, `useReturnGiftEligibility`, `FloatingGiftButton`, `AnimatePresence`
- Remove all return-gift state variables and effects (lines 38-81)
- Simplify the JSX to only render `PlayerProfileModal` and `{children}`

No database changes needed.
