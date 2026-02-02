

# Plan: Optimize Shop Layout & PRO Card Mobile Design

## Overview

Based on the screenshots, there are 4 issues to fix:
1. **Move shop content up by 60px** - Reduce the gap between the PRO carousel and product cards
2. **Decrease power-up count badges by 5%** - Make them smaller so they don't touch the "ძალები" title
3. **Benefits text overlapping mascot video on mobile** - Convert to a vertical list instead of 2-column grid
4. **Price below title on mobile only** - Move price from header row to its own row on mobile screens

---

## Technical Changes

### File 1: `src/components/shop/MobileProCarousel.tsx`

#### Change 1: Reduce bottom padding to move content up by 60px

**Line 73** - Decrease bottom padding from `pb-[30px]` to `pb-0`:

```typescript
// Before:
<div className="px-4 pt-4 pb-[30px]">

// After:
<div className="px-4 pt-4 pb-0">
```

#### Change 2: Convert benefits to single column list on mobile (2 columns on tablet+)

**Lines 128-138** - Change grid to flex column on mobile, 2 cols on md+:

```typescript
// Before:
<ul className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">

// After:
<ul className="flex flex-col gap-1.5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-2 mb-4">
```

#### Change 3: Move price below title on mobile

**Lines 107-125** - Restructure header to show price inline on md+, below title on mobile:

```typescript
// Before (all inline):
<div className="flex items-center gap-3 mb-2">
  <div className="icon">...</div>
  <h3 className="text-base md:text-lg font-bold text-white flex-1">{tier.nameKa}</h3>
  <div className="flex items-baseline gap-1">
    <span className="text-xl md:text-2xl font-black text-white">₾{tier.price}</span>
    <span className="text-xs md:text-sm text-white/70">/თვე</span>
  </div>
</div>

// After (price below on mobile):
<div className="flex flex-wrap items-center gap-3 mb-2">
  <div className="icon">...</div>
  <h3 className="text-base md:text-lg font-bold text-white">{tier.nameKa}</h3>
  {/* Price - md+: inline with header */}
  <div className="hidden md:flex items-baseline gap-1">
    <span className="text-2xl font-black text-white">₾{tier.price}</span>
    <span className="text-sm text-white/70">/თვე</span>
  </div>
</div>
{/* Price - mobile only: below title */}
<div className="flex md:hidden items-baseline gap-1 mb-2">
  <span className="text-xl font-black text-white">₾{tier.price}</span>
  <span className="text-xs text-white/70">/თვე</span>
</div>
```

---

### File 2: `src/components/shop/PowerUpsSummary.tsx`

#### Change: Decrease badge size by ~5%

**Line 30** - Reduce `min-w` from 58px to 55px and reduce icon size:

```typescript
// Before:
className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm min-w-[58px]"
...
<img src={POWER_UP_ICONS[type]} alt="" className="w-5 h-5" />

// After:
className="flex items-center justify-between gap-1.5 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm min-w-[54px]"
...
<img src={POWER_UP_ICONS[type]} alt="" className="w-[18px] h-[18px]" />
```

**Line 41** - Reduce text size slightly:

```typescript
// Before:
className="text-sm font-bold text-foreground/90"

// After:
className="text-[13px] font-bold text-foreground/90"
```

---

## Summary

| Issue | File | Change |
|-------|------|--------|
| Gap too large | `MobileProCarousel.tsx` | Remove `pb-[30px]` → `pb-0` |
| Power-up badges too wide | `PowerUpsSummary.tsx` | Reduce sizes by ~5% |
| Benefits overlay mascot | `MobileProCarousel.tsx` | Single column list on mobile, 2-col on md+ |
| Price inline on mobile | `MobileProCarousel.tsx` | Move price below title, show inline only on md+ |

---

## Visual Result

**Before (Mobile):**
```text
┌─────────────────────────────────────────────┐
│ [Icon] სამეგობრო PRO        ₾19.99/თვე     │  ← Price inline, tight
│                                             │
│  ✓ Solo PRO +     ✓ საოჯახო                │  ← 2 columns overlay
│    5 მეგობარი       ლიდერბორდი              │     mascot video
│  ✓ ყველა PRO      ✓ ერთობლივი              │
│    ფუნქცია          გამოწვევები             │
│                                             │
│         [ შეძენა > ]                        │
└─────────────────────────────────────────────┘
                      ↓ 30px gap
 ძალები [40] [44] [6] [14]   ← badges touch title
```

**After (Mobile):**
```text
┌─────────────────────────────────────────────┐
│ [Icon] სამეგობრო PRO                        │  ← Title only
│ ₾19.99/თვე                                  │  ← Price on new line
│                                             │
│  ✓ Solo PRO + 5 მეგობარი                    │  ← Single column
│  ✓ საოჯახო ლიდერბორდი                       │     list, no overlap
│  ✓ ყველა PRO ფუნქცია                        │
│  ✓ ერთობლივი გამოწვევები                    │
│                                             │
│         [ შეძენა > ]                        │
└─────────────────────────────────────────────┘
 ძალები [40] [44] [6] [14]   ← 5% smaller badges
```

