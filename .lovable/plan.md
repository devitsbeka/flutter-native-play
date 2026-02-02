
# Plan: Fix PRO Carousel Benefits Layout & Mascot Video

## Overview

Two issues to fix in `MobileProCarousel.tsx`:
1. Benefits text should show 3 columns on first row, 1 on second row
2. Mascot video is cropped at bottom - need to show full figure

---

## Changes

### File: `src/components/shop/MobileProCarousel.tsx`

### 1. Benefits Layout - 3 columns + 1 row

**Current (lines 133-143):**
- Shows only 3 benefits with `tier.benefits.slice(0, 3)`
- Uses flex-wrap which creates 2+1 layout currently

**New layout:**
- Show all 4 benefits
- Use CSS Grid for precise 3-column layout on first row
- Fourth benefit spans or starts new row

```text
Row 1: [Benefit 1] [Benefit 2] [Benefit 3]
Row 2: [Benefit 4]
```

**Code change:**
```tsx
{/* Benefits - Grid layout: 3 columns first row, 1 on second */}
<div className="grid grid-cols-3 gap-x-3 gap-y-1.5 mb-4">
  {tier.benefits.map((benefit, i) => (
    <div 
      key={i} 
      className="flex items-center gap-1.5 text-sm text-white/90"
    >
      <Check className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
      <span className="text-xs">{benefit}</span>
    </div>
  ))}
</div>
```

### 2. Mascot Video - Show Full Figure

**Current (line 192):**
```tsx
className="absolute inset-0 w-full h-full object-cover object-top"
```

**Problem:** `object-top` aligns to top but mascot body is cropped at bottom

**Solution:** Change to `object-center` to center the mascot vertically, showing the full figure

```tsx
className="absolute inset-0 w-full h-full object-cover object-center"
```

---

## Visual Result

### Before:
```text
┌──────────────────────────────────┬─────────┐
│ ✓ Benefit 1    ✓ Benefit 2       │  TOP    │
│ ✓ Benefit 3                      │ (crown) │
│                                  │ cropped │
│ [Button]                         │  body   │
└──────────────────────────────────┴─────────┘
```

### After:
```text
┌──────────────────────────────────┬─────────┐
│ ✓ Benefit 1  ✓ Benefit 2  ✓ B3   │         │
│ ✓ Benefit 4                      │ FULL    │
│                                  │ MASCOT  │
│ [Button]                         │         │
└──────────────────────────────────┴─────────┘
```

---

## Summary of Changes

| Line | Change |
|------|--------|
| 133-143 | Replace flex-wrap with CSS grid (grid-cols-3), show all 4 benefits |
| 192 | Change `object-top` → `object-center` for video positioning |
