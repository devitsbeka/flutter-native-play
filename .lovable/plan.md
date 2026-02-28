

## Restructure Invite Card Layout + Add to Shop Page

### Changes

#### 1. Restructure `InviteFriendsMiniCard` in `ProPlansSection.tsx`
Change from horizontal layout (icon | text+badge | share button) to vertical:
- Line 1: Title text "მოიწვიე მეგობრები და გახდით PRO მომხმარებლები"
- Line 2: Reward badge "🎁 10 დღიანი PRO საჩუქრად"
- Line 3: Share button "გაზიარება"

Remove the Users icon circle on the left to match the cleaner vertical layout shown in the reference.

#### 2. Extract `InviteFriendsMiniCard` to a shared component
Move `InviteFriendsMiniCard` to `src/components/shared/InviteFriendsMiniCard.tsx` so it can be reused by both the Profile PRO tab and the Shop page. It will include its own share logic (generate referral link, call navigator.share or clipboard fallback) so each consumer doesn't need to wire that up.

#### 3. Add the card to the Shop page (`ShopStandardLayout.tsx`)
Insert the `InviteFriendsMiniCard` as the first element in the shop layout, above the hero carousel / MobileProCarousel. It will appear as a compact banner at the top of the shop.

### Files to Change

| File | Change |
|------|--------|
| `src/components/shared/InviteFriendsMiniCard.tsx` | New file - extracted and restructured vertical layout with self-contained share logic |
| `src/components/profile/ProPlansSection.tsx` | Import shared `InviteFriendsMiniCard`, remove the local function definition |
| `src/components/shop/ShopStandardLayout.tsx` | Import and render `InviteFriendsMiniCard` at the top of the layout |

