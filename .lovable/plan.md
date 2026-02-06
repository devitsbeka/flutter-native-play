

# Plan: Balance Top and Bottom Padding on Shop Item Cards

## Problem

The shop item cards have unequal visual spacing:
- **Top**: Padding above the icon is smaller than the bottom
- **Bottom**: Padding below the CTA button needs to match the top

Looking at the current code:
- Card has `p-3 sm:p-4` (12px/16px all around)
- No extra top padding for the icon
- The CTA button sits flush with the card padding

## Solution

Add explicit top padding to match the visual weight and ensure bottom padding is consistent by adjusting the card's internal padding structure.

## File to Modify

| File | Change |
|------|--------|
| `src/components/shop/ShopItemCard.tsx` | Adjust padding: use `pt-4 sm:pt-5` at top and `pb-4 sm:pb-5` at bottom |

## Technical Changes

### Update Card Container (Line 118-124)

Change the padding from uniform `p-3 sm:p-4` to explicit vertical padding:

```tsx
// Before
"p-3 sm:p-4",

// After  
"px-3 sm:px-4 pt-4 sm:pt-5 pb-4 sm:pb-5",
```

This ensures:
- **Top padding**: `16px` on mobile, `20px` on larger screens (above icon)
- **Bottom padding**: `16px` on mobile, `20px` on larger screens (below CTA)
- **Horizontal padding**: Stays the same at `12px` / `16px`

## Visual Result

```
┌─────────────────────┐
│                     │ ← pt-4 (16px) equal
│      [ICON]         │
│    500 მონეტა       │
│      პატარა         │
│     💎 1            │
│   [შეძენა]          │
│                     │ ← pb-4 (16px) equal
└─────────────────────┘
```

