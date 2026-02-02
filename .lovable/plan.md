

# Plan: Adjust PRO Card Layout on Tablet

## Overview

Based on the screenshot, you want to:
1. **Increase card heights** - Make the PRO card taller
2. **Increase benefits text sizes** - Larger font for the benefit items
3. **Change layout ratio** - Left content: 65%, Mascot video: 35%

---

## File: `src/components/shop/MobileProCarousel.tsx`

### Change 1: Increase Card Height

**Line 75** - Increase minimum height:

```typescript
// Before:
<div className="relative overflow-hidden rounded-3xl min-h-[280px]">

// After: Increase height for tablet
<div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[360px]">
```

### Change 2: Increase Benefits Text Size

**Lines 128-137** - Update text sizes in benefits list:

```typescript
// Before:
<ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-4">
  {tier.benefits.map((benefit, i) => (
    <li 
      key={i} 
      className="flex items-start gap-1.5 text-white/90"
    >
      <Check className="w-3 h-3 text-white/80 flex-shrink-0 mt-0.5" />
      <span className="text-[11px] leading-tight">{benefit}</span>
    </li>
  ))}
</ul>

// After: Larger text and icons on tablet
<ul className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
  {tier.benefits.map((benefit, i) => (
    <li 
      key={i} 
      className="flex items-start gap-2 text-white/90"
    >
      <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/80 flex-shrink-0 mt-0.5" />
      <span className="text-xs md:text-sm leading-tight">{benefit}</span>
    </li>
  ))}
</ul>
```

### Change 3: Adjust Content/Video Ratio to 65%/35%

**Line 106** - Add explicit width to left content:

```typescript
// Before:
<div className="flex-1 p-5 z-10">

// After: 65% width for content
<div className="w-[65%] p-5 z-10">
```

**Lines 180-191** - Change video width to 35%:

```typescript
// Before:
<div className="w-[120px] flex-shrink-0 relative overflow-hidden">

// After: 35% width for video
<div className="w-[35%] flex-shrink-0 relative overflow-hidden">
```

### Change 4: Additional Sizing Improvements

**Lines 108-125** - Increase header text sizes on tablet:

```typescript
// Before:
<h3 className="text-base font-bold text-white flex-1">
  {tier.nameKa}
</h3>
<div className="flex items-baseline gap-1">
  <span className="text-xl font-black text-white">₾{tier.price}</span>
  <span className="text-xs text-white/70">/თვე</span>
</div>

// After: Larger on tablet
<h3 className="text-base md:text-lg font-bold text-white flex-1">
  {tier.nameKa}
</h3>
<div className="flex items-baseline gap-1">
  <span className="text-xl md:text-2xl font-black text-white">₾{tier.price}</span>
  <span className="text-xs md:text-sm text-white/70">/თვე</span>
</div>
```

**Line 150** - Increase CTA button text on tablet:

```typescript
// Before:
className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"

// After:
className="w-full py-3 md:py-4 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
```

---

## Summary

| Element | Before | After |
|---------|--------|-------|
| Card min-height | `280px` | `320px` mobile, `360px` tablet |
| Left content width | `flex-1` | `65%` |
| Video width | `120px` | `35%` |
| Benefit text | `11px` | `12px` mobile, `14px` tablet |
| Benefit icons | `12px` | `14px` mobile, `16px` tablet |
| Title text | `16px` | `16px` mobile, `18px` tablet |
| Price text | `20px` | `20px` mobile, `24px` tablet |
| CTA button | `py-3 text-sm` | `py-3/py-4 text-sm/text-base` |

---

## Visual Result

```text
Before:
┌─────────────────────────────────────────┬───────┐
│ [Crown] სოლო PRO           ₾9.99 /თვე  │       │
│ ✓ 2x XP ბონუსი   ✓ ექსკლუზიური        │ Video │
│ ✓ რეკლამების     ✓ პრიორიტეტული       │ 120px │
│ [          გააქტიურება          ]      │       │
└─────────────────────────────────────────┴───────┘
                    ~80%                    ~20%

After:
┌──────────────────────────────────────┬──────────────┐
│ [Crown] სოლო PRO          ₾9.99 /თვე │              │
│                                      │              │
│ ✓ 2x XP ბონუსი    ✓ ექსკლუზიური     │    Video     │
│ ✓ რეკლამების      ✓ პრიორიტეტული    │     35%      │
│                                      │              │
│ [          გააქტიურება          ]    │              │
└──────────────────────────────────────┴──────────────┘
                    65%                      35%
```

