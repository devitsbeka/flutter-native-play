

# Plan: Fix Mobile PRO Carousel Layout

## Problems Identified

1. **Benefits text is unreadable** - Using `grid-cols-3` layout which crams 4 benefits into 3 columns, causing text wrapping and overlap
2. **Price position** - Currently on same row as title, should be below the title for mobile
3. **Card cropping** - Content may be getting cut off due to layout constraints

## Solution

Change the mobile carousel card layout to:
1. Stack title and price vertically (title on top, price below)
2. Display all 4 benefits as a vertical list (not grid)
3. Ensure proper spacing and prevent cropping

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

**1. Restructure Header Section (lines 108-130)**

Change from horizontal `Icon > Title > Price` to:
- Row 1: Icon + Title
- Row 2: Price below title

```typescript
{/* Header - Icon + Title, Price below */}
<div className="mb-3">
  <div className="flex items-center gap-3 mb-1">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" ...>
      <TierIcon className="w-5 h-5 text-white" />
    </div>
    <h3 className="text-base font-bold text-white">{tier.nameKa}</h3>
  </div>
  
  {/* Price below title */}
  <div className="flex items-baseline gap-1 ml-[52px]">
    <span className="text-xl font-black text-white">₾{tier.price}</span>
    <span className="text-xs text-white/70">/თვე</span>
  </div>
</div>
```

**2. Change Benefits to Vertical List (lines 132-143)**

Replace the 3-column grid with a vertical stack:

```typescript
{/* Benefits - Vertical list */}
<ul className="space-y-1.5 mb-4">
  {tier.benefits.map((benefit, i) => (
    <li key={i} className="flex items-start gap-2 text-white/90">
      <Check className="w-3.5 h-3.5 text-white/80 flex-shrink-0 mt-0.5" />
      <span className="text-xs leading-tight">{benefit}</span>
    </li>
  ))}
</ul>
```

**3. Adjust Video Width (line 186)**

Reduce video section width to give more space to content:

```typescript
<div className="w-[120px] flex-shrink-0 relative overflow-hidden">
```

## Visual Result

**Before:**
```text
┌─────────────────────────────────────────┐
│ [Icon] Title         ₾19.99/თვე  │[Video]│
│ ✓ benefit1  ✓ benefit2  ✓ benefit3      │
│ ✓ benefit4                              │
│ [Button]                                │
└─────────────────────────────────────────┘
```

**After:**
```text
┌─────────────────────────────────────────┐
│ [Icon] Title                     │[Video]│
│        ₾19.99/თვე                │       │
│ ✓ 2x XP ბონუსი ყველა თამაშში     │       │
│ ✓ ექსკლუზიური VIP ბეჯი           │       │
│ ✓ რეკლამების გარეშე              │       │
│ ✓ პრიორიტეტული მხარდაჭერა        │       │
│ [Button]                         │       │
└─────────────────────────────────────────┘
```

## Summary

| Section | Change |
|---------|--------|
| Header | Stack title and price vertically instead of horizontally |
| Price position | Move below title, aligned with title text |
| Benefits | Change from 3-column grid to vertical list |
| Video area | Reduce width from 160px to 120px for more content space |

