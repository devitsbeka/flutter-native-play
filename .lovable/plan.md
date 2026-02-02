
# Plan: Update Power-Ups Summary Layout for Tablet

## Overview

Modify the `PowerUpsSummary` component to:
1. Display as a **2-column grid** on tablet (md breakpoint) instead of a single row of 4
2. Position the **count/price at the right edge** of each chip using `justify-between`

---

## Visual Design

**Current (single row):**
```
ძალები   [🔴2] [❄️1] [🔄1] [⏰1]
```

**After (2 columns on tablet, price at right edge):**
```
ძალები   ┌─────────────────────┐
         │ [🔴        2] [❄️        1] │  ← Row 1
         │ [🔄        1] [⏰        1] │  ← Row 2
         └─────────────────────┘
         
Each chip: [icon    price→]
```

On desktop (lg+): Keep as single row of 4
On tablet (md): Show as 2x2 grid
On mobile: Keep as single row (wraps naturally)

---

## Technical Changes

### File: `src/components/shop/PowerUpsSummary.tsx`

**Line 25** - Update container classes:
```typescript
// Before:
<div className="flex items-center gap-2">

// After:
<div className="flex flex-wrap md:grid md:grid-cols-2 lg:flex lg:flex-nowrap items-center gap-1.5 md:gap-2">
```

**Lines 27-34** - Update chip layout for price at right edge:
```typescript
// Before:
<div
  key={type}
  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur-sm"
  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
>
  <img src={POWER_UP_ICONS[type]} alt="" className="w-4 h-4" />
  <span className="text-xs font-bold text-foreground/90">{powerUps[type]}</span>
</div>

// After:
<div
  key={type}
  className="flex items-center justify-between gap-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm min-w-[52px] md:min-w-[56px]"
  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
>
  <img src={POWER_UP_ICONS[type]} alt="" className="w-4 h-4" />
  <span className="text-xs font-bold text-foreground/90">{powerUps[type]}</span>
</div>
```

---

## Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| Layout (tablet) | Single row | 2-column grid |
| Layout (desktop) | Single row | Single row (preserved) |
| Price position | Immediately after icon | Right edge of chip |
| Min-width | None | 52-56px for consistent chip size |
| Gap | gap-1 | gap-2 for better spacing |

---

## Summary

| File | Action |
|------|--------|
| `src/components/shop/PowerUpsSummary.tsx` | EDIT - Update layout to 2-col grid on tablet, price at right edge |

This provides a cleaner layout on tablet screens where horizontal space may be limited, while keeping the single-row layout on desktop.
