

# Plan: Increase Carousel Card Height on Desktop/Tablet

## Analysis

Based on the screenshots and code review:

1. **Current Layout Structure**:
   - `ShopHeroCarousel` is shown only on **desktop (xl+)** with fixed height of `340px`
   - `MobileProCarousel` is shown on **mobile and tablet (below xl)** with `min-h-[320px] md:min-h-[360px]`

2. **Issue**: The screenshots show tablet views where there's a large gap between the PRO carousel card and the "ძალები" section below

3. **Solution**: Increase the height of the carousel cards to fill more vertical space and reduce the gap

---

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

Increase the `min-h` values for the carousel container on tablet (md) breakpoint:

**Line 75** - Change min-height values:

```typescript
// BEFORE:
<div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[360px]">

// AFTER:
<div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[420px]">
```

This increases the tablet carousel height from `360px` to `420px` (60px taller).

---

### File: `src/components/shop/ShopHeroCarousel.tsx`

Increase the height for the desktop carousel:

**Line 164** - Change fixed height:

```typescript
// BEFORE:
<div 
  className="relative overflow-hidden rounded-3xl touch-pan-y" 
  style={{ height: 340 }}
  ...
>

// AFTER:
<div 
  className="relative overflow-hidden rounded-3xl touch-pan-y" 
  style={{ height: 400 }}
  ...
>
```

This increases the desktop carousel height from `340px` to `400px` (60px taller).

---

## Summary

| Screen | Before | After | Change |
|--------|--------|-------|--------|
| Mobile (<768px) | 320px min-height | 320px min-height | No change |
| Tablet (768px-1279px) | 360px min-height | 420px min-height | +60px |
| Desktop (≥1280px) | 340px fixed | 400px fixed | +60px |

---

## Visual Result

**Before:**
```text
┌──────────────────────────────┐
│      PRO Carousel (360px)    │
└──────────────────────────────┘
            ↓
         ~200px gap
            ↓
ძალები [40] [44] [6] [17]
┌────┐ ┌────┐ ┌────┐ ┌────┐
│Card│ │Card│ │Card│ │Card│
└────┘ └────┘ └────┘ └────┘
```

**After:**
```text
┌──────────────────────────────┐
│                              │
│      PRO Carousel (420px)    │
│                              │
└──────────────────────────────┘
            ↓
         ~140px gap (reduced)
            ↓
ძალები [40] [44] [6] [17]
┌────┐ ┌────┐ ┌────┐ ┌────┐
│Card│ │Card│ │Card│ │Card│
└────┘ └────┘ └────┘ └────┘
```

