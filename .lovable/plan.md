

## Shop PRO Cards: Swipe, Card Count, Click-to-Profile, Remove Frames

### Changes

**1. Add swipe navigation to MobileProCarousel (MobileProCarousel.tsx)**
- Replace the auto-rotate AnimatePresence with touch/swipe support using `framer-motion` drag gestures
- Users can swipe left/right to navigate between the 2 PRO cards
- Keep the dot indicators as-is but also add a "1/2" style card count label below the card

**2. Show card count below the carousel (MobileProCarousel.tsx)**
- Add a text indicator like "1 / 2" centered below the dots to show current position out of total

**3. Click on PRO card navigates to profile PRO tab (MobileProCarousel.tsx)**
- Tapping anywhere on the card (except the CTA button) navigates to `/profile?tab=PRO`
- The existing "შეძენა" button keeps its current purchase behavior (stopPropagation)

**4. Remove frames from PRO benefits (multiple files)**
- Remove any "ჩარჩო" or "frame" references from PRO tier benefits in `ProPlansSection.tsx` if present
- Remove `canAccessVipFrames` from `VipContext.tsx` (or leave as no-op for safety)
- Note: The current `PRO_TIERS` benefits in `ProPlansSection.tsx` and `MobileProCarousel.tsx` don't mention frames, so the main cleanup targets are `VipContext.tsx` and any shop tab references

### Files to Change

| File | Change |
|------|--------|
| `src/components/shop/MobileProCarousel.tsx` | Add swipe gestures via framer-motion drag; add "1/2" card count below dots; wrap card in clickable container that navigates to `/profile?tab=PRO` |
| `src/contexts/VipContext.tsx` | Remove `canAccessVipFrames` function (or make it always return false) |

### Technical Details

- Use `framer-motion`'s `drag="x"` on the card with `onDragEnd` to detect swipe direction and change `currentIndex`
- Card click handler: `navigate('/profile?tab=PRO')` using react-router-dom
- The CTA button already has `e.stopPropagation()` so it won't trigger navigation
- Card count rendered as a simple `<p>` element: `{currentIndex + 1} / {PRO_TIERS.length}`
- For `canAccessVipFrames`: update to return `false` and keep the function signature to avoid breaking imports, or remove if no other files depend on it
