
# Plan: Lighten Text Strokes on "შენი ლიგა" Badge

## Problem
The text strokes/shadows on the "შენი ლიგა" (Your League) badge appear too dark and heavy, particularly on the Gold tier badge shown in the screenshot.

## Root Cause
In `src/pages/Leaderboards.tsx`, the `AnimatedLeagueBadge` component defines metallic styles for each tier. The Gold tier (tier 3) uses:
- Dark text color: `#2D1F00` 
- Light shadow: `rgba(255, 255, 255, 0.4)`

The text shadow is applied as:
```tsx
textShadow: `0 1px 2px ${style.shadowColor}, 0 0 1px ${style.shadowColor}`
```

The issue is that the shadow opacity and blur are creating a heavy stroke appearance.

## Solution
Reduce the shadow intensity by:
1. Lowering the opacity of shadow colors for all tiers
2. Reducing the blur radius in the textShadow property

## Technical Changes

### File: `src/pages/Leaderboards.tsx`

**Lines 74-94** - Update shadowColor values with lower opacity:

| Tier | Current shadowColor | New shadowColor |
|------|---------------------|-----------------|
| Bronze (1) | `rgba(69, 35, 10, 0.8)` | `rgba(69, 35, 10, 0.4)` |
| Silver (2) | `rgba(255, 255, 255, 0.5)` | `rgba(255, 255, 255, 0.3)` |
| Gold (3) | `rgba(255, 255, 255, 0.4)` | `rgba(255, 255, 255, 0.25)` |

**Lines 144-146** - Soften the text shadow blur:

```tsx
// Current
textShadow: `0 1px 2px ${style.shadowColor}, 0 0 1px ${style.shadowColor}`

// Proposed - lighter and softer
textShadow: `0 1px 1px ${style.shadowColor}`
```

This removes the double shadow effect and reduces blur from 2px to 1px.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Leaderboards.tsx` | Update shadowColor opacity values and simplify textShadow |
