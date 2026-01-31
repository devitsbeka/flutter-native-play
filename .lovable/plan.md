
# Shop Page Scroll & Sticky Header Fix

## Problems Identified

### 1. Cannot Scroll All The Way Down
The bottom padding is applied in multiple nested places with mismatched breakpoints:
- `MainLayout` applies `pb-24 md:pb-0` to the main scroll container
- `PowerUps.tsx` inner content has `pb-24 lg:pb-0` (different breakpoint than MainLayout!)
- `ShopStandardLayout` adds `pb-8`

The bottom nav hides at `md:hidden` but padding changes at `lg:pb-0` - this mismatch means on tablets (md-lg), there's no bottom nav but also no padding, causing content to be cut off.

### 2. Header Not Sticky/Visible
The sticky header wrapper lacks iOS safe-area padding (`safe-top`), and the header's `bg-white/80` transparency makes it hard to see over the colorful gradient background.

---

## Solution

### File: `src/pages/PowerUps.tsx`

**Change 1: Add safe-area padding to sticky header container**
```tsx
// Line 242: Update the sticky header wrapper
<div className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
```

**Change 2: Fix mismatched bottom padding breakpoint**
```tsx
// Line 251: Change lg:pb-0 to md:pb-0 to match MainLayout
<div className="flex-1 relative pb-24 md:pb-0 bg-transparent...">
```
This aligns with MainLayout which uses `md:pb-0` and bottom nav which hides at `md:hidden`.

### File: `src/components/shop/ShopHeader.tsx`

**Change 3: Improve header visibility over gradient backgrounds**
Replace the transparent white background with a more opaque, visible background that works over gradients:
```tsx
// Line 20: Update container background
<div className="bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
```

---

## Technical Details

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Can't scroll to bottom | `lg:pb-0` vs `md:hidden` breakpoint mismatch | Change to `md:pb-0` |
| Header not visible | `bg-white/80` too transparent on gradients | Use `bg-background/95` |
| Header cut off on iOS | Missing safe-area-inset-top | Add `pt-[env(safe-area-inset-top)]` |

## Files to Modify
1. `src/pages/PowerUps.tsx` - Fix sticky header padding and bottom padding breakpoint
2. `src/components/shop/ShopHeader.tsx` - Improve background visibility
