
# Plan: Match LIVE Badge Style Across All Logo Sizes

## Problem

The LIVE badge on the loading/splash screen looks different from the badges shown elsewhere in the app. The loading screen badge has:
- More rounded, pill-shaped edges (appears like `rounded-full`)
- Larger proportions relative to text
- More balanced spacing

Currently, the `LiveBadge` component uses a fixed `rounded-[8px]` for all sizes, which doesn't scale properly with larger badge sizes.

## Solution

Update the `LiveBadge` component to use size-proportional border radius that creates the pill-shaped look seen on the loading screen. For smaller sizes, a rounded-full approach works better than a fixed 8px radius.

### File: `src/components/social/LiveBadge.tsx`

**Changes:**
1. Add `rounded` to the size config to scale border-radius with badge size
2. Use `rounded-full` for smaller sizes (sm, md) to achieve the pill shape
3. Use proportional rounded values for larger sizes (lg, xl)
4. Slightly increase padding to match the reference look

| Size | Current | New Border Radius |
|------|---------|------------------|
| sm   | 8px     | rounded-full     |
| md   | 8px     | rounded-full     |
| lg   | 8px     | rounded-full     |
| xl   | 8px     | rounded-full     |

**Updated size config:**
```typescript
const sizeConfig = {
  sm: { text: "text-[8px]", dot: "w-1 h-1", px: "px-2", py: "py-1", gap: "gap-1", rounded: "rounded-full" },
  md: { text: "text-[10px]", dot: "w-1.5 h-1.5", px: "px-2.5", py: "py-1", gap: "gap-1", rounded: "rounded-full" },
  lg: { text: "text-[13px]", dot: "w-2 h-2", px: "px-3", py: "py-1.5", gap: "gap-1.5", rounded: "rounded-full" },
  xl: { text: "text-[15px]", dot: "w-2.5 h-2.5", px: "px-4", py: "py-2", gap: "gap-2", rounded: "rounded-full" },
};
```

This will give the badge the same pill-shaped appearance across all sizes, matching the loading screen reference.

## Result

After this change, the LIVE badge will have a consistent pill-shaped appearance throughout the app, matching the loading screen design that the user referenced.
