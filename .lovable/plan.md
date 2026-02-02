
# Plan: Center Home Page Content on Desktop

## Problem Analysis

On desktop (xl+), the main content (avatar, username, coins/gems, play button) appears shifted to the right instead of being centered in the viewport. This happens because:

1. **Left sidebar** takes up ~220px (visible on md+)
2. **Right action cards panel** is fixed position at ~340px width (visible on lg+)
3. The content centers within `<main>` which is `flex-1`, but doesn't account for the asymmetric side panels

The current centering is relative to the main content area only, not accounting for visual balance with the fixed right panel.

---

## Solution

Add a negative left margin offset on xl+ layouts to shift the centered content leftward, compensating for the space taken by the right action cards panel. This creates visual balance.

---

## Technical Changes

### File: `src/pages/Index.tsx`

#### Change 1: Fix md-to-xl Layout Centering (Lines 571-784)

Add left offset to account for right-side action cards on lg+ screens:

**Location: Line 571**
```typescript
// BEFORE:
{user && <div className="hidden md:flex xl:hidden items-center justify-center w-full h-full px-4">

// AFTER:
{user && <div className="hidden md:flex xl:hidden items-center justify-center w-full h-full px-4 lg:-ml-[170px]">
```

The `lg:-ml-[170px]` shifts content left by half the action cards width (~340px/2) on lg+ screens where the action cards are visible.

---

#### Change 2: Fix xl+ Layout Centering (Lines 787-874)

Add left offset to account for right-side action cards:

**Location: Line 787-788**
```typescript
// BEFORE:
{user && <motion.div 
  className="hidden xl:flex flex-col items-center justify-center w-full h-full px-4"

// AFTER:
{user && <motion.div 
  className="hidden xl:flex flex-col items-center justify-center w-full h-full px-4 -ml-[170px]"
```

The `-ml-[170px]` shifts the entire content block leftward to compensate for the right panel, centering it visually in the remaining viewport space.

---

## Summary

| Layout | Change | Purpose |
|--------|--------|---------|
| md-xl (tablet) | Add `lg:-ml-[170px]` | Offset left when right cards visible (lg+) |
| xl+ (desktop) | Add `-ml-[170px]` | Offset left for right action cards panel |

---

## Expected Result

- Avatar, username, coins/gems displays, and play button will be **visually centered** in the viewport
- The centering accounts for both the left sidebar and right action cards panel
- Content appears balanced between the two side panels
- Mobile layout remains unchanged (no side panels)
