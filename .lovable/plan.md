

# Plan: Fix Gap Between "ჩემი ძალები" Title and Power Cards

## Problem Analysis

Looking at the reference screenshots:

```text
Current:                          Target (like ძალები):
ჩემი ძალები                       ჩემი ძალები
    🎯  ❄️  (icons almost touch)       ↓ proper gap
┌────┐                                 🎯  ❄️  🔄  ⏱️
                                   ┌────┐
```

The "ძალები" section below uses:
- Title margin: `mb-2` (8px)
- No extra top margin on grid

For "ჩემი ძალები" with overlapping icons, we need to account for the 24px icon offset while maintaining the same visual rhythm.

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Adjust margins to match ძალები section spacing |

---

## Technical Changes

### Current spacing:
- Title: `mb-1` (4px)
- Grid: `mt-4` (16px)
- Total gap: ~20px, but icons overlap by 24px, causing them to nearly touch title

### Fixed spacing:
- Title: `mb-4` (16px) - more breathing room
- Grid: `mt-6` (24px) - accounts for icon overlap of 24px

This creates:
- 16px (mb-4) + 24px (mt-6) = 40px total gap
- Minus 24px icon overlap = **16px visible gap** between title text and icon top
- This matches the visual rhythm of the "ძალები" section

### Code changes:

```tsx
// Line 30 - Update title margin
<h2 className="text-lg font-display text-foreground mb-4">ჩემი ძალები</h2>

// Line 32 - Update grid margin
<div className="grid grid-cols-4 gap-3 mt-6">
```

---

## Visual Result

```text
ჩემი ძალები
     ↓ 16px visible gap (matching ძალები section)
     🎯    ❄️    🔄    ⏱️
  ┌─────────────────────────┐
  │  46  │  49  │  11  │  22 │
  │ (+)  │ (+)  │ (+)  │ (+) │
  └─────────────────────────┘

ძალები
     ↓ ~16px gap (mb-2 + natural spacing)
  ┌────────────┬────────────┐
  │ 50/50 ×3   │ გაყინვა ×3 │
```

---

## Summary

1. Increase title bottom margin from `mb-1` to `mb-4` for proper breathing room
2. Increase grid top margin from `mt-4` to `mt-6` to properly account for the 24px icon overlap
3. This creates consistent visual spacing between both sections

