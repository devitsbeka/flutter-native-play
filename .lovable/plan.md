
# Plan: Improve Tablet Layout for PRO Carousel

## Overview

Redesign the `MobileProCarousel` component to have a more flexible tablet layout with:
1. Single-row header: Icon → Title → Price (right-aligned)
2. Horizontal benefits list instead of vertical
3. Better padding and spacing to prevent cropping

---

## Changes

### File: `src/components/shop/MobileProCarousel.tsx`

**Restructure the card layout for tablet:**

### 1. Header Row - Flex with space-between

```text
┌─────────────────────────────────────────────────────────────┐
│ [Icon]   სოლო PRO / სამეგობრო PRO            ₾19.99 /თვე  │
└─────────────────────────────────────────────────────────────┘
```

- Icon on left
- Title in middle (flex-1)
- Price on right edge

### 2. Benefits Row - Horizontal flex-wrap

```text
┌─────────────────────────────────────────────────────────────┐
│ ✓ Solo PRO + 5   ✓ საოჯახო ლიდერბორდი   ✓ ყველა PRO      │
└─────────────────────────────────────────────────────────────┘
```

- `flex flex-wrap gap-x-4 gap-y-1` instead of vertical `space-y-2`
- Smaller text and compact checkmarks
- Benefits flow horizontally and wrap if needed

### 3. Improved Spacing

- Increase padding from `p-4` to `p-5` for more breathing room
- Add safe margin from video section
- Ensure CTA button has proper spacing

---

## Layout Comparison

### Before (Mobile-style vertical):
```text
┌────────────────────────────────┬─────────┐
│ [Icon]                         │         │
│ სამეგობრო PRO                  │  VIDEO  │
│ ₾19.99 /თვე                    │         │
│                                │         │
│ ✓ Solo PRO + 5 მეგობარი       │         │
│ ✓ საოჯახო ლიდერბორდი          │         │
│ ✓ ყველა PRO ფუნქცია           │         │
│                                │         │
│ [      შეძენა      ]           │         │
└────────────────────────────────┴─────────┘
```

### After (Tablet-optimized horizontal):
```text
┌────────────────────────────────────────────────────┬─────────┐
│ [Icon]  სამეგობრო PRO                   ₾19.99/თვე │         │
│                                                    │  VIDEO  │
│ ✓ Solo PRO + 5  ✓ საოჯახო ლიდერბორდი  ✓ ყველა PRO │         │
│                                                    │         │
│ [                    შეძენა                      ] │         │
└────────────────────────────────────────────────────┴─────────┘
```

---

## Code Changes

```tsx
{/* Header - Icon, Title, Price in one row */}
<div className="flex items-center gap-3 mb-3">
  {/* Icon */}
  <div className="w-12 h-12 rounded-xl ...">
    <TierIcon className="w-6 h-6 text-white" />
  </div>
  
  {/* Title - flex-1 to push price to right */}
  <h3 className="flex-1 text-base font-bold text-white">
    {tier.nameKa}
  </h3>
  
  {/* Price - right aligned */}
  <div className="flex items-baseline gap-1 flex-shrink-0">
    <span className="text-xl font-black text-white">₾{tier.price}</span>
    <span className="text-xs text-white/70">/თვე</span>
  </div>
</div>

{/* Benefits - Horizontal with flex-wrap */}
<div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
  {tier.benefits.slice(0, 3).map((benefit, i) => (
    <div 
      key={i} 
      className="flex items-center gap-1.5 text-sm text-white/90"
    >
      <Check className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
      <span>{benefit}</span>
    </div>
  ))}
</div>
```

---

## Additional Improvements

1. **Padding**: Increase container padding from `p-4` to `p-5`
2. **Video width**: Adjust from `w-[140px]` to `w-[160px]` for better balance
3. **CTA Button**: Keep full width with proper margins
4. **Benefits text**: Slightly smaller font for better fit

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/shop/MobileProCarousel.tsx` | Restructure header row, horizontal benefits |
