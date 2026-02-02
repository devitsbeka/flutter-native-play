

# Plan: Reduce Gap Between Carousel and Shop Content on Tablet

## Problem

The gap between the PRO carousel card and the "ძალები" (powers) section is too large on tablet. The recent increase to `md:min-h-[420px]` made it worse.

## Solution

Reduce the carousel container height on tablet to bring the content closer together. Target approximately 100px gap as requested.

---

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

**Line 75** - Reduce the tablet min-height:

```typescript
// BEFORE:
<div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[420px]">

// AFTER:
<div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[340px]">
```

This reduces the tablet carousel height from `420px` back to `340px`, which should create a gap closer to 100px.

---

## Summary

| Screen | Before | After | Change |
|--------|--------|-------|--------|
| Mobile (<768px) | 320px | 320px | No change |
| Tablet (768px+) | 420px | 340px | -80px |

---

## Visual Result

**Before (420px):**
```text
┌──────────────────────────────┐
│      PRO Carousel (420px)    │
└──────────────────────────────┘
            ↓
         ~200px gap (too big!)
            ↓
ძალები [40] [44] [6] [17]
```

**After (340px):**
```text
┌──────────────────────────────┐
│      PRO Carousel (340px)    │
└──────────────────────────────┘
            ↓
         ~100px gap ✓
            ↓
ძალები [40] [44] [6] [17]
```

