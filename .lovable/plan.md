

## Make Invite Card a Carousel Slide Matching PRO Card Style

### Goal
Turn the "Invite Friends" banner into a card that looks identical to the Solo PRO and Family PRO cards (with mascot video on the right side), and show it as the first slide in the MobileProCarousel. Also update the ProPlansSection to use the same card style.

### Changes

#### 1. Update `MobileProCarousel.tsx` - Add invite slide as first card

- Add a third slide type to the carousel: an "invite" slide shown first (index 0), before Solo PRO (index 1) and Family PRO (index 2)
- The invite slide uses the same card layout as PRO cards:
  - Left 65%: Title "მოიწვიე მეგობრები და გახდით PRO მომხმარებლები", reward badge "🎁 10 დღიანი PRO საჩუქრად", and a "გაზიარება" (Share) button
  - Right 35%: Same mascot video (shopbg.mp4/webm)
  - Background: Pink/purple gradient (`linear-gradient(135deg, #EC4899 0%, #9333EA 100%)`)
- The share button triggers the same referral logic from `useFriendInvites`
- Update the dot indicators and auto-rotate to include the new slide (3 total)

#### 2. Update `ProPlansSection.tsx` - Replace InviteFriendsMiniCard with matching card

- Replace the current `<InviteFriendsMiniCard />` at the top with a full-width card matching the TierCard style:
  - Same rounded-2xl, border, shadow, shimmer effect
  - Pink/purple gradient background
  - Content: icon + title + reward badge + share button
  - This card appears first, before the Solo PRO and Family PRO tier cards
- The card uses the same referral share logic

#### 3. Keep `InviteFriendsMiniCard` shared component
- Keep it as-is for use in the Shop page (compact version)
- The ProPlansSection and MobileProCarousel will have their own styled versions inline

### Files to Change

| File | Change |
|------|--------|
| `src/components/shop/MobileProCarousel.tsx` | Add invite slide as index 0 with pink/purple gradient, share logic, same layout as PRO cards |
| `src/components/profile/ProPlansSection.tsx` | Replace `InviteFriendsMiniCard` with a full TierCard-style invite card shown first |

### Technical Details

**MobileProCarousel invite slide structure:**
```text
[Left 65%]                    [Right 35%]
Share2 icon + "მოიწვიე..."    Mascot video
🎁 10 დღიანი PRO საჩუქრად
[გაზიარება button]
```

**Gradient:** `linear-gradient(135deg, #EC4899 0%, #9333EA 100%)`

The invite slide uses `useFriendInvites` hook for `createLinkInvite` and `navigator.share` / clipboard fallback, same as the existing `InviteFriendsMiniCard`.
