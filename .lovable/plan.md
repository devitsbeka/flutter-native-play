

## Consolidate Gift Modals into One "Invite Friends" Flow

### What Changes

Right now there are **two separate modals** that can both appear on the home screen:
1. **ProGiftModal** -- gives 10 days PRO directly for free (claim button)
2. **InviteFriendsModal** -- generates a referral link to share with friends

We will **remove the ProGiftModal entirely** and keep only the **InviteFriendsModal** as the single entry point. The key behavior change: **PRO is no longer given as a direct gift.** It is only granted when an invited friend actually joins.

### New User Flow

1. Eligible user (5+ games, non-VIP) lands on home screen
2. The **InviteFriendsModal** ("მოიწვიე მეგობრები!") appears automatically
3. When user shares/copies the link, a message is shown: **"როცა მოწვეული მეგობარი შემოგვიერთდება, შენ და შენი მეგობარი მიიღებთ 10 დღიან PRO-ს!"**
4. If user clicks "მოგვიანებით" (Later), the **FloatingGiftButton** appears for easy return
5. When the invited friend actually registers, **both users get 10 days PRO** (already handled by the existing `process_referral_reward` RPC)

### Technical Changes

**1. `src/pages/Index.tsx`**
- Remove all `ProGiftModal` imports, state, effects, and rendering
- Remove `useProGiftEligibility` import and usage
- Remove `proGiftModalOpen`, `proGiftDismissedThisSession`, `proGiftClaimed` states
- Remove the `pro-gift-claimed` event listener
- Update the auto-show logic: use the existing `useInviteModalVisibility` hook but broaden its trigger -- show for eligible users (5+ games, non-VIP) instead of only when free games are exhausted
- Update the `FloatingGiftButton` priority logic to only reference the invite modal flow
- Remove `ProGiftModal` rendering from JSX

**2. `src/components/home/InviteFriendsModal.tsx`**
- Update the `useInviteModalVisibility` hook: change condition from `freeGamesExhausted` to a broader eligibility check (user exists, not VIP, not dismissed)
- Add a confirmation/info text after the user copies or shares the link: "როცა მოწვეული მეგობარი შემოგვიერთდება, შენ და შენი მეგობარი მიიღებთ 10 დღიან PRO-ს!"
- Keep the existing glassmorphic design with the group-of-people icon

**3. `src/components/home/ProGiftBanner.tsx`**
- Keep the file but mark `useProGiftEligibility` and `ProGiftModal` as deprecated/unused, or remove them entirely since they are no longer referenced

**4. No database changes needed** -- the existing `process_referral_reward` RPC already handles granting 10 days PRO to both inviter and invited friend upon successful referral signup.

