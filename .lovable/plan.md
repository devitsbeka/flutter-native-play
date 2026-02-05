

# Plan: Remove Frames from PRO Benefits

## Overview
The user wants to remove all references to "frames/ჩარჩოები/ფრეიმები" from the PRO benefits since frames feature is not yet available. The benefits shown in the web version should match the mobile Android version (but without frames).

---

## Current vs Target Benefits

### Current (Web - Incorrect)
- VIP ბეჯი + ფრეიმები (has frames)
- ექსკლუზიური ჩარჩოები (frames listed as separate benefit)

### Target (Remove Frames)
- VIP ბეჯი (badge only, no frames)
- Remove any standalone frame benefits

---

## Files to Modify

### 1. `src/components/profile/ProPlansSection.tsx`

**Line 72 - PRO_TIERS pro_plus benefits:**
```tsx
// Before
{ icon: Star, text: 'VIP ბეჯი + ფრეიმები' },

// After
{ icon: Star, text: 'VIP ბეჯი' },
```

**Lines 256-264 - Upgrade card benefits (isSoloPro scenario):**
```tsx
// Before
<span className="text-sm text-muted-foreground">VIP ბეჯი + ფრეიმები</span>

// After
<span className="text-sm text-muted-foreground">VIP ბეჯი</span>
```

---

### 2. `src/hooks/useVipStatus.ts`

**Line 29 - VIP_BENEFITS array:**
```tsx
// Before
{ icon: "🎨", title: "ექსკლუზიური ჩარჩოები", description: "VIP-ისთვის განკუთვნილი ავატარის ჩარჩოები" },

// Remove this entire benefit line
```

**Line 48 - VIP_BENEFITS_BY_TIER.pro_plus:**
```tsx
// Before
{ icon: "🎨", title: "ექსკლუზიური ჩარჩოები", description: "3 VIP-ისთვის განკუთვნილი ჩარჩო" },

// Remove this entire benefit line
```

---

## Summary of Changes

| File | Location | Change |
|------|----------|--------|
| `ProPlansSection.tsx` | Line 72 | Remove "ფრეიმები" from text |
| `ProPlansSection.tsx` | Line 263 | Remove "ფრეიმები" from text |
| `useVipStatus.ts` | Line 29 | Remove "ექსკლუზიური ჩარჩოები" benefit |
| `useVipStatus.ts` | Line 48 | Remove "ექსკლუზიური ჩარჩოები" benefit |

---

## Final Benefits Display

**PRO (Solo) - ₾9.99/თვე:**
- 1 მეგობრის მოწვევა
- რეკლამების გარეშე
- VIP ბეჯი

**სამეგობრო PRO - ₾19.99/თვე:**
- 5 მეგობრის მოწვევა
- რეკლამების გარეშე
- VIP ბეჯი
- ყოველდღიური ჯილდოები



This matches the mobile Android display but without frame references.

