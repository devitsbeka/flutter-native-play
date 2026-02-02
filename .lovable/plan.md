
# Plan: Fix the Huge Gap Between Carousel and Shop Content

## Root Cause Analysis

Looking at the screenshot and code structure:

1. **MobileProCarousel** (line 73): Has `px-4 pt-4 pb-0` - no bottom padding
2. **ShopStandardLayout** (line 63): Has `flex-1 pb-8` - no margin between carousel and sections
3. **ShopProductGrid** (line 31): Has `mb-6` - only bottom margin

The gap comes from the tall purple background area. The carousel container uses `min-h-[340px]` but the actual card inside is smaller, causing unused space.

**The real fix**: Remove the `min-h` constraint entirely and add a small bottom margin. The card should size to its content naturally.

---

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

**Line 73** - Change wrapper padding to add bottom margin:

```typescript
// BEFORE:
<div className="px-4 pt-4 pb-0">

// AFTER:
<div className="px-4 pt-4 pb-2 md:pb-4">
```

**Line 75** - Remove min-height constraints that create empty space:

```typescript
// BEFORE:
<div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[340px]">

// AFTER:
<div className="relative overflow-hidden rounded-3xl">
```

**Line 83** - Add explicit height to the inner motion.div so it sizes properly:

```typescript
// BEFORE:
className="relative rounded-2xl overflow-hidden flex h-full"

// AFTER:  
className="relative rounded-2xl overflow-hidden flex min-h-[280px] md:min-h-[300px]"
```

This moves the height control to the **inner card** (that has the gradient) instead of the outer container, eliminating the gap.

---

## Summary

| Change | Purpose |
|--------|---------|
| Remove outer `min-h-[320px] md:min-h-[340px]` | Stop container from creating empty space |
| Add inner `min-h-[280px] md:min-h-[300px]` | Keep card tall enough for content |
| Add `pb-2 md:pb-4` to wrapper | Small consistent gap below carousel |

---

## Visual Result

**Before:**
```text
┌──────────────────────────────┐
│      PRO Card (actual)       │
├──────────────────────────────┤
│   EMPTY SPACE (min-h gap!)   │  ← This creates the huge gap
└──────────────────────────────┘
            ↓
ძალები [40] [44] [6] [17]
```

**After:**
```text
┌──────────────────────────────┐
│      PRO Card (actual)       │
└──────────────────────────────┘
    ↓ 16-24px gap only
ძალები [40] [44] [6] [17]
```
