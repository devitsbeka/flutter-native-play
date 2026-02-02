
# Plan: Fix LIVE Badge Corner Radius to Match Design

## Problem

The current LIVE badge uses `rounded-full` which creates a pill shape with maximum rounding. Your Figma design shows the badge should have a **70px corner radius** at large size - this is a softer rounded rectangle, NOT fully rounded edges.

## Analysis from Figma Reference

From your screenshot:
- Badge dimensions: part of 858×338 frame
- Corner radius: **70px** (all corners)
- This is a rounded rectangle, not a pill shape

## Solution

Replace `rounded-full` with proportional fixed corner radii that match the design:

### Calculated Corner Radii (proportional to badge height)

| Size | Badge Height (approx) | Corner Radius | Tailwind Class |
|------|----------------------|---------------|----------------|
| sm   | ~18px                | 4px           | `rounded-[4px]` |
| md   | ~22px                | 5px           | `rounded-[5px]` |
| lg   | ~30px                | 7px           | `rounded-[7px]` |
| xl   | ~38px                | 9px           | `rounded-[9px]` |

The ratio is approximately **badge height × 0.25** to match the proportions shown in the Figma (70px radius for a ~280px tall badge = 25% ratio).

## Technical Changes

### File: `src/components/social/LiveBadge.tsx`

Update the `sizeConfig` to use fixed pixel corner radii instead of `rounded-full`:

```typescript
const sizeConfig = {
  sm: { text: "text-[8px]", dot: "w-1 h-1", px: "px-2", py: "py-1", gap: "gap-1", rounded: "rounded-[4px]" },
  md: { text: "text-[10px]", dot: "w-1.5 h-1.5", px: "px-2.5", py: "py-1", gap: "gap-1", rounded: "rounded-[5px]" },
  lg: { text: "text-[13px]", dot: "w-2 h-2", px: "px-3", py: "py-1.5", gap: "gap-1.5", rounded: "rounded-[7px]" },
  xl: { text: "text-[15px]", dot: "w-2.5 h-2.5", px: "px-4", py: "py-2", gap: "gap-2", rounded: "rounded-[9px]" },
};
```

## Result

After this change, the LIVE badge will have softly rounded corners that match your Figma design - a rounded rectangle shape rather than a pill shape. The corner radius will scale proportionally with each size variant while maintaining the same visual style as your reference image.
