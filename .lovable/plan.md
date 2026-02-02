
# Plan: Shop Layout Improvements

## Overview

This plan addresses 3 UI improvements based on the tablet screenshot:
1. **Price position** - Move price to the right side of title (same line), not below
2. **Decrease gap** - Reduce spacing between PRO carousel and shop content below
3. **Power-ups summary** - Increase container sizes by 20% and move to right side of header row

---

## Issue 1: Move Price to Right Side of Title

### File: `src/components/shop/MobileProCarousel.tsx`

Currently the layout is:
```text
[Icon] სამეგობრო PRO
       ₾19.99 /თვე
```

Change to horizontal layout with price on the right:
```text
[Icon] სამეგობრო PRO     ₾19.99 /თვე
```

**Lines 108-130** - Restructure header to single row:

```typescript
// Before:
<div className="mb-2">
  <div className="flex items-center gap-3">
    {/* Icon */}
    {/* Title */}
  </div>
  {/* Price below title */}
  <div className="flex items-baseline gap-1 ml-[52px]">
    <span>₾{tier.price}</span>
  </div>
</div>

// After: Single row with price on right
<div className="flex items-center gap-3 mb-2">
  <div 
    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
    style={{ ... }}
  >
    <TierIcon className="w-5 h-5 text-white" />
  </div>
  <h3 className="text-base font-bold text-white flex-1">
    {tier.nameKa}
  </h3>
  <div className="flex items-baseline gap-1">
    <span className="text-xl font-black text-white">₾{tier.price}</span>
    <span className="text-xs text-white/70">/თვე</span>
  </div>
</div>
```

---

## Issue 2: Decrease Gap Between Carousel and Shop Content

### File: `src/components/shop/MobileProCarousel.tsx`

Reduce bottom padding of the carousel container.

**Line 73** - Change padding:

```typescript
// Before:
<div className="px-4 pt-4 pb-2">

// After: Remove bottom padding
<div className="px-4 pt-4 pb-0">
```

**Lines 201-214** - Reduce dot indicator section margins:

```typescript
// Before:
<div className="flex justify-center gap-2 mt-3">

// After:
<div className="flex justify-center gap-2 mt-2">
```

### File: `src/components/shop/ShopProductGrid.tsx`

Reduce top margin of first section.

**Line 38** - Reduce section header margin:

```typescript
// Before:
<div className="px-[15px] mb-3">

// After:
<div className="px-[15px] mb-2">
```

---

## Issue 3: Increase Power-Ups Containers Size and Move to Right

### File: `src/components/shop/PowerUpsSummary.tsx`

**Size Increase (20%):**
- Icon: `w-4 h-4` (16px) becomes `w-5 h-5` (20px) - 25% increase
- Container padding: `px-2 py-0.5` becomes `px-2.5 py-1`
- Min-width: `48px` becomes `58px`
- Font size: `text-xs` becomes `text-sm`

**Line 26** - Update container classes:

```typescript
// Before:
<div className="flex flex-nowrap items-center gap-1.5 md:gap-2">

// After: Add ml-auto to push to right
<div className="flex flex-nowrap items-center gap-2 md:gap-2.5 ml-auto">
```

**Lines 27-47** - Update individual container sizes:

```typescript
// Before:
<div
  className="flex items-center justify-between gap-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm min-w-[48px]"
>
  <img src={POWER_UP_ICONS[type]} alt="" className="w-4 h-4" />
  ...
  <motion.span className="text-xs font-bold text-foreground/90">

// After: 20% larger
<div
  className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm min-w-[58px]"
>
  <img src={POWER_UP_ICONS[type]} alt="" className="w-5 h-5" />
  ...
  <motion.span className="text-sm font-bold text-foreground/90">
```

### File: `src/components/shop/ShopProductGrid.tsx`

Update the flex container to push PowerUpsSummary to the right.

**Lines 38-45** - Change layout to use flex with space-between:

```typescript
// Before:
<div className="px-[15px] mb-2">
  <div className="flex items-center gap-3">
    <h2 className="text-lg font-display font-bold text-foreground/90 drop-shadow-sm">
      {title}
    </h2>
    {sectionId === "powers" && <PowerUpsSummary />}
  </div>
</div>

// After: Use justify-between to push power-ups to right
<div className="px-[15px] mb-2">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-display font-bold text-foreground/90 drop-shadow-sm">
      {title}
    </h2>
    {sectionId === "powers" && <PowerUpsSummary />}
  </div>
</div>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/shop/MobileProCarousel.tsx` | Price on same line as title (right side), reduce bottom padding |
| `src/components/shop/ShopProductGrid.tsx` | justify-between layout, reduce margin |
| `src/components/shop/PowerUpsSummary.tsx` | 20% larger containers, push to right with ml-auto |

---

## Visual Result

**Price Position:**
```text
Before: [Icon] სამეგობრო PRO
               ₾19.99 /თვე

After:  [Icon] სამეგობრო PRO          ₾19.99 /თვე
```

**Power-Ups Layout:**
```text
Before: ძალები [50/50: 40] [freeze: 44] [replace: 6] [time: 14]

After:  ძალები                    [50/50: 40] [freeze: 44] [replace: 6] [time: 14]
        (title on left)           (containers on right, 20% larger)
```
