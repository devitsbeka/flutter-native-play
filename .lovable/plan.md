

## Convert PRO Gift Banner to Modal with Celebration Animations

### What Changes

1. **Replace inline banner with a modal** -- The current `ProGiftBanner` in the header area becomes a full-screen modal (similar to the existing `BetaGiftModal` design). It auto-opens with a short delay when the user enters the home page.

2. **Celebration animations on claim** -- When user clicks "მიიღე":
   - Canvas confetti burst (already used in BetaGiftModal)
   - Golden glow animation on the Play button in the bottom nav for 2-3 seconds
   - Modal closes after success

3. **Floating gift button on dismiss** -- If user closes the modal without claiming, show the existing `FloatingGiftButton` so they can open it later.

### Technical Details

**File: `src/components/home/ProGiftBanner.tsx`**
- Rename/refactor to `ProGiftModal` -- a Dialog-based modal with offer phase (reusing the same purple gradient style from the banner but in modal form)
- On claim success: fire `canvas-confetti`, dispatch a custom event `pro-gift-claimed` to trigger play button glow, then close
- Export `useProGiftEligibility()` hook to check promo date, VIP status, and localStorage claim status
- On dismiss: call `onDismiss` callback (parent shows floating gift button)

**File: `src/pages/Index.tsx`**
- Remove the inline `<ProGiftBanner />` div (lines 500-503)
- Add state management for the ProGiftModal: auto-open on mount with ~1.5s delay, dismissed state shows FloatingGiftButton, claimed state hides everything
- Import and render `ProGiftModal` and `FloatingGiftButton`

**File: `src/components/layout/UniversalBottomNav.tsx`**
- Listen for `pro-gift-claimed` custom event on window
- When received, trigger the existing golden glow animation on the Hex3DPlayButton for 2-3 seconds (reuse the `showGlow` state mechanism already built into the component)

### Files to Edit
- `src/components/home/ProGiftBanner.tsx` -- convert to modal component with confetti
- `src/pages/Index.tsx` -- remove banner, add modal + floating gift button logic
- `src/components/layout/UniversalBottomNav.tsx` -- add event listener for play button glow trigger

