
# Make Power-Up Cards Fully Clickable to Open Purchase Modal

## What Changes

When you tap any power-up card in the "My Powers" section on the shop page, it will open the Power-Up Shop Modal pre-selected to that power type, showing its demo preview, quantity selector, and buy button with coin pricing.

## Changes Summary

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Add `onCardClick` prop; make the entire card div clickable with cursor-pointer and tap feedback |
| `src/components/shop/ShopStandardLayout.tsx` | Pass through new `onCardClick` prop to MyPowersSection |
| `src/pages/PowerUps.tsx` | Wire `onCardClick` to open the existing `PowerUpShopModal` with the selected power type |

## Technical Details

### MyPowersSection.tsx
- Add `onCardClick: (type: PowerUpType) => void` to the props interface
- Wrap the card `div` with an `onClick` handler that calls `onCardClick(type)`
- Add `cursor-pointer` class and hover/active scale feedback to the card
- Keep the existing coin buy button functional (it still does instant single purchase) -- clicking the button itself won't bubble to open the modal (use `stopPropagation`)

### ShopStandardLayout.tsx
- Add `onCardClick` to the interface and pass it through to `MyPowersSection`

### PowerUps.tsx
- Create a handler that sets `selectedPowerType` and opens `showPowerShopModal`
- Pass this handler as `onCardClick` to `ShopStandardLayout`

This reuses the existing `PowerUpShopModal` which already has the full purchase flow with quantity selection, coin pricing, demo preview, and success animation.
