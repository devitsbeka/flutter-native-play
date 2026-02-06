
# Plan: Fix "My Powers" Section Visibility

## Problem Analysis

From the user's screenshots, the "ჩემი ძალები" (My Powers) section is showing:
- A single `+` button floating in empty space
- No title visible
- No power-up icons or counts visible
- The "ძალები" section below is rendering correctly

This indicates the `MyPowersSection` component is either:
1. Not receiving proper data and crashing silently
2. Having styling issues where content is invisible
3. The parent component isn't passing valid props

## Root Cause

Even though we added a default value for `powerUps` in the component signature, the issue occurs when:
- `shopData.powerUps` from the parent could be `undefined` before React Query resolves
- The component may render before data is available

## Solution

### Files to Modify

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Add explicit null/undefined check before rendering |
| `src/components/shop/ShopStandardLayout.tsx` | Add fallback default when passing `powerUps` prop |

---

## Technical Changes

### 1. Add Defensive Check in MyPowersSection

Add a safety check at the top of the component to handle any undefined data:

```tsx
// At the top of the component function
const safeData = powerUps ?? { "5050": 0, freeze: 0, replace: 0, "time-drain": 0 };
```

And use `safeData` instead of `powerUps` when mapping.

### 2. Add Fallback in ShopStandardLayout

Ensure the prop always has a valid object:

```tsx
<MyPowersSection
  powerUps={powerUps ?? { "5050": 0, freeze: 0, replace: 0, "time-drain": 0 }}
  onPurchaseSingle={onSinglePowerPurchase}
  isPurchasing={isPurchasing}
/>
```

---

## Additional Improvement: Debug Visibility

Add a visible background color temporarily to debug if the section wrapper is rendering:

```tsx
<div className="px-4 py-4 bg-amber-100/50"> {/* Temporary debug color */}
```

This will help verify if the container is being rendered even when content is invisible.

---

## Visual Confirmation

After fixes:
```text
┌─────────────────────────────────────┐
│     PRO Carousel                    │
├─────────────────────────────────────┤
│ ჩემი ძალები                         │
│ [🎯 2 +] [❄️ 1 +] [🔄 1 +] [⏱️ 1 +] │
├─────────────────────────────────────┤
│ ძალები                              │
│ [Power Pack Cards...]               │
└─────────────────────────────────────┘
```

---

## Summary

1. Add explicit null-coalescing (`??`) in both components to ensure `powerUps` is never undefined
2. This triple-layer defense ensures data is always valid:
   - Layer 1: `useShopPageData` hook returns defaults
   - Layer 2: `ShopStandardLayout` passes fallback value
   - Layer 3: `MyPowersSection` uses internal fallback
