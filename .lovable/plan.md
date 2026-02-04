

# Plan: Enhance LIVE Badge & Hide No-Ads Button for Pro Users

## Overview
This plan addresses two changes:
1. Make "LIVE" text in the LiveBadge component bolder and 20% bigger
2. Hide the "no-ads" (ad-free) button on the home screen when the user has Pro/VIP status

---

## Change 1: Make "LIVE" Text Bolder and 20% Bigger

### Current State
The `LiveBadge` component in `src/components/social/LiveBadge.tsx` uses these text sizes:
- sm: `text-[8px]`
- md: `text-[10px]`
- lg: `text-[13px]`
- xl: `text-[15px]`

The text already uses `font-black` (boldest weight), so it's already bold.

### What to Change
Increase the font sizes by 20%:
- sm: `8px → 10px` (rounded from 9.6)
- md: `10px → 12px`
- lg: `13px → 16px` (rounded from 15.6)
- xl: `15px → 18px`

### File: `src/components/social/LiveBadge.tsx`
Update the `sizeConfig` object with new text sizes.

---

## Change 2: Hide No-Ads Button When User Has Pro

### Current State
The ad-free button appears in two places:
1. **Desktop sidebar** (`DesktopActionCards.tsx`): Already hidden for VIP users with `{!isVip && (...)}`
2. **Mobile orbiting buttons** (`Index.tsx`): Always shown regardless of VIP status

### What to Change
In `src/pages/Index.tsx`, wrap the ad-free `ActionButtonWithParticles` (around lines 1013-1031) with a VIP check to hide it when the user has Pro/VIP status.

### Files to Modify
| File | Change |
|------|--------|
| `src/components/social/LiveBadge.tsx` | Increase text sizes by 20% |
| `src/pages/Index.tsx` | Wrap ad-free button with `{!isVip && (...)}` condition |

---

## Technical Details

### LiveBadge.tsx Changes

```typescript
const sizeConfig = {
  sm: { text: "text-[10px]", dot: "w-1 h-1", px: "px-2", py: "py-1", gap: "gap-1", rounded: "rounded-[4px]" },
  md: { text: "text-[12px]", dot: "w-1.5 h-1.5", px: "px-2.5", py: "py-1", gap: "gap-1", rounded: "rounded-[5px]" },
  lg: { text: "text-[16px]", dot: "w-2 h-2", px: "px-3", py: "py-1.5", gap: "gap-1.5", rounded: "rounded-[7px]" },
  xl: { text: "text-[18px]", dot: "w-2.5 h-2.5", px: "px-4", py: "py-2", gap: "gap-2", rounded: "rounded-[9px]" },
};
```

The text already uses `font-black` which is the maximum font weight, so it's already as bold as possible.

### Index.tsx Changes
Wrap the ad-free button section (around line 1013-1031) with:
```tsx
{!isVip && (
  <motion.div ...>
    <ActionButtonWithParticles iconSrc={adFreeIcon} ... />
  </motion.div>
)}
```

Note: The `isVip` variable is already available in Index.tsx from `useDailyPlays()` hook.

---

## Summary

| Component | Change |
|-----------|--------|
| `LiveBadge.tsx` | Increase "LIVE" text sizes by 20% (8→10, 10→12, 13→16, 15→18 px) |
| `Index.tsx` | Hide ad-free button on mobile when user has VIP status |

