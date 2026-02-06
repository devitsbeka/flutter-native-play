
# Plan: Equal Size Shop Item Cards with Consistent Spacing

## Problem

From the screenshots:
1. Cards have different heights - descriptions with 1 line vs 2 lines cause size variations
2. Top/bottom padding needs to be exactly 16px
3. Gap between description and price row is inconsistent

## Solution

Make all cards equal height with:
- Fixed 16px (`p-4`) top and bottom padding
- Fixed height for description area (reserve space for 2 lines always)
- Use `flex-grow` on description to push price section down consistently

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/shop/ShopItemCard.tsx` | Standardize padding to 16px, fix description height |

---

## Technical Changes

### 1. Update Card Container Padding (Lines 118-124)

```tsx
// Before
"px-3 sm:px-4 pt-4 sm:pt-5 pb-4 sm:pb-5",
"min-h-[180px] sm:min-h-[200px]",

// After - exactly 16px top/bottom padding
"px-3 sm:px-4 p-4",
"h-[200px] sm:h-[220px]",  // Fixed height for equal cards
```

### 2. Fix Description to Reserve 2-Line Height (Lines 154-157)

```tsx
// Before
<p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mb-2">{description}</p>

// After - reserve height for 2 lines, use flex-grow to fill space
<div className="flex-1 flex items-start">
  <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 w-full">
    {description}
  </p>
</div>
```

### 3. Remove mb-2 from Description, Add Gap to Container

The description wrapper will grow to fill available space, pushing the price section to a consistent position at the bottom.

---

## Visual Result

```text
┌─────────────────────────────┐
│ ← 16px padding top          │
│         [ICON]              │
│        გაყინვა ×3           │
│                             │
│    დრო გაყინდება 5 წამით    │ ← 1-line desc (flex grows below)
│         [space]             │ ← flex-grow fills this
│         💎 3                │
│       [შეძენა]              │
│ ← 16px padding bottom       │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ← 16px padding top          │
│         [ICON]              │
│        50/50 ×3             │
│                             │
│    ნაშლის 2 არასწორი        │ ← 2-line desc
│        პასუხს               │
│         💎 3                │
│       [შეძენა]              │
│ ← 16px padding bottom       │
└─────────────────────────────┘
```

Both cards are now exactly the same height with consistent 16px padding.

---

## Summary

1. Set exact 16px padding on all sides
2. Use fixed card height instead of min-height
3. Make description area flex-grow to fill space between content and price
4. All cards will be equal size regardless of description length
