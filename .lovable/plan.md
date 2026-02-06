

# Plan: Fix Empty Space Bug & Remove Duplicate Power-Up Pills

## Problem Identified

After investigating, I found two issues:

1. **Duplicate power-up pills**: Both `MyPowersSection` (shows "ჩემი ძალები" with + buttons) and `PowerUpsSummary` (inside the "ძალები" header) display the same power-up counts. This creates visual redundancy.

2. **Empty space during render**: The empty gap the user sees is caused by animation timing - `MyPowersSection` uses `framer-motion` with `initial={{ opacity: 0, y: 10 }}` which starts invisible and animates in. This causes a flash of empty space during the layout calculation phase.

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/ShopProductGrid.tsx` | Remove `PowerUpsSummary` from "powers" section header |
| `src/components/shop/MyPowersSection.tsx` | Remove initial animation to prevent layout shift |

---

## Technical Changes

### 1. Remove PowerUpsSummary from ShopProductGrid

Since `MyPowersSection` now handles displaying user's powers with purchase functionality, the `PowerUpsSummary` in the "ძალები" section header is redundant.

```tsx
// Before (line 43)
{sectionId === "powers" && <PowerUpsSummary />}

// After: Remove this line entirely
// The title now just shows "ძალები" without duplicate pills
```

### 2. Stabilize MyPowersSection Layout

Remove the animation that causes the empty space flash:

```tsx
// Before
<motion.div
  key={type}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="..."
>

// After - no initial animation, stable height
<div
  key={type}
  className="..."
>
```

This ensures the component renders immediately without causing layout shift.

---

## Visual Result

```text
Before (duplicate):
┌─────────────────────────────┐
│     PRO Carousel            │
├─────────────────────────────┤
│ ჩემი ძალები                 │  ← My Powers section
│ [45][49][11][22] + buttons  │
├─────────────────────────────┤
│ ძალები [45][49][11][22]     │  ← DUPLICATE pills from PowerUpsSummary
│ [Power Card] [Power Card]   │
└─────────────────────────────┘

After (clean):
┌─────────────────────────────┐
│     PRO Carousel            │
├─────────────────────────────┤
│ ჩემი ძალები                 │  ← My Powers section
│ [45][49][11][22] + buttons  │
├─────────────────────────────┤
│ ძალები                      │  ← Clean header, no duplicate
│ [Power Card] [Power Card]   │
└─────────────────────────────┘
```

---

## Summary

1. Remove `PowerUpsSummary` from `ShopProductGrid` - eliminates duplicate display
2. Remove animation from `MyPowersSection` power cards - prevents empty space flash during mount
3. Clean, single source of power-up information with purchase capability

