
# Plan: Reduce Gap in Shop Item Cards

## Summary

Remove the large empty white space between the description text and the price/button area in shop cards.

---

## Current Problem

The cards have a fixed aspect ratio (`aspect-[1/1.35]`) forcing a tall container, while the description has `flex-1` making it expand to fill remaining space - creating a large gap.

```text
┌──────────────────┐
│     [Icon]       │
│      Name        │
│   Description    │
│                  │  ← Large empty space (flex-1)
│                  │
│    💎 30         │
│   [შეძენა]       │
└──────────────────┘
```

---

## Solution

1. **Remove fixed aspect ratio** - Let content determine height
2. **Remove `flex-1` from description** - Stop it from expanding
3. **Reduce margins/padding** - Tighter vertical spacing

---

## File to Modify

| File | Changes |
|------|---------|
| `src/components/shop/ShopItemCard.tsx` | Remove aspect ratio, adjust gaps |

---

## Technical Changes

### Lines 121-124 - Remove aspect ratio

**Before:**
```typescript
"p-3 sm:p-4 md:p-5",
"aspect-[1/1.35] sm:aspect-[1/1.45]",
```

**After:**
```typescript
"p-3 sm:p-4",
"min-h-[180px] sm:min-h-[200px]",
```

### Line 141 - Reduce icon margin

**Before:**
```typescript
className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mb-2 sm:mb-3"
```

**After:**
```typescript
className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mb-1.5 sm:mb-2"
```

### Line 156 - Remove flex-1 from description

**Before:**
```typescript
<p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-2 flex-1">{description}</p>
```

**After:**
```typescript
<p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mb-2">{description}</p>
```

### Line 160 - Reduce price section gap

**Before:**
```typescript
<div className="mt-auto w-full flex flex-col items-center gap-1 sm:gap-1.5">
```

**After:**
```typescript
<div className="mt-auto w-full flex flex-col items-center gap-0.5">
```

---

## Expected Result

```text
┌──────────────────┐
│     [Icon]       │
│      Name        │
│   Description    │
│    💎 30         │  ← Compact, no wasted space
│   [შეძენა]       │
└──────────────────┘
```

Cards will have consistent height based on content, with minimal gaps between elements while maintaining readability.
