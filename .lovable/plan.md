

## Add Mini "Invite Friends" Section Above PRO Plans

### Goal
Add a compact referral banner above the PRO tier cards on the Profile page's PRO tab, showing "მოიწვიე მეგობრები და გახდით PRO მომხმარებლები" with a share button. This gives users a quick way to share their referral link without navigating elsewhere.

### Changes

#### 1. Update `src/components/profile/ProPlansSection.tsx`

Add a new `InviteFriendsMiniCard` section at the top of the `ProPlansSection` component (before the tier cards), visible only when the user is **not** already PRO:

- A compact card with a purple-to-amber gradient background
- Family/friends icon on the left
- Text: "მოიწვიე მეგობრები და გახდით PRO მომხმარებლები" (localized via translation key)
- "10 დღიანი PRO საჩუქრად" pill badge
- A single "გაზიარება" (Share) button that:
  - Generates a referral link via `useFriendInvites().createLinkInvite`
  - Uses `navigator.share()` if available, otherwise copies to clipboard
- Compact design (~80px height) so it doesn't push the PRO cards too far down

#### 2. Add translation keys in `src/locales/ka.ts` and `src/locales/en.ts`

- `extra.inviteMiniTitle`: "მოიწვიე მეგობრები და გახდით PRO მომხმარებლები" / "Invite friends and become PRO users"
- `extra.inviteMiniReward`: "10 დღიანი PRO საჩუქრად" / "10 days PRO as gift"
- `extra.shareBtn`: "გაზიარება" / "Share" (may already exist, will reuse if so)

### Technical Details

- The mini card will be rendered inside `ProPlansSection` at the top of the `isNotPro` scenario block (before the tier map)
- Uses `useFriendInvites` hook for `createLinkInvite` to get/generate referral code
- Share logic: `navigator.share({ url: referralUrl })` with clipboard fallback + toast
- Styled with gradient background matching the invite modal aesthetic (purple-to-amber)
- Uses `motion.div` for enter animation consistent with the rest of the section
- Also shown for `isSoloPro` and `isFamilyPro` scenarios (everyone can invite)

