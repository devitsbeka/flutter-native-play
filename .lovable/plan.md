

# Plan: Match Title Font and Gap for "ჩემი ძალები"

## Visual Comparison

```text
Current:                          Target:
ჩემი ძალები  (font-bold)          ჩემი ძალები  (font-display)
     ↓ mb-3 + mt-6 gap                 ↓ smaller gap
     
     🎯    ❄️    🔄    ⏱️              🎯    ❄️    🔄    ⏱️
  ┌─────┐                           ┌─────┐
```

---

## Changes Required

| Element | Current | Target |
|---------|---------|--------|
| Title font | `font-bold` | `font-display` (decorative Georgian font) |
| Title margin | `mb-3` | `mb-0` or `mb-1` (icons will overlap into gap) |
| Grid margin | `mt-6` | `mt-4` (reduce since title margin reduced) |

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Update title font class and adjust spacing |

---

## Technical Changes

### Line 30 - Update title styling

```tsx
// Before:
<h2 className="text-lg font-bold text-foreground mb-3">ჩემი ძალები</h2>

// After:
<h2 className="text-lg font-display text-foreground mb-1">ჩემი ძალები</h2>
```

### Line 32 - Adjust grid top margin

```tsx
// Before:
<div className="grid grid-cols-4 gap-3 mt-6">

// After:
<div className="grid grid-cols-4 gap-3 mt-4">
```

---

## Visual Result

```text
ჩემი ძალები    ← Decorative font-display (matches "ძალები" section)
   🎯  ❄️  🔄  ⏱️   ← Icons closer to title
┌────┬────┬────┬────┐
│ 46 │ 49 │ 11 │ 22 │
│(+) │(+) │(+) │(+) │
└────┴────┴────┴────┘
```

---

## Summary

1. Change title from `font-bold` to `font-display` for decorative Georgian styling
2. Reduce title bottom margin from `mb-3` to `mb-1`
3. Reduce grid top margin from `mt-6` to `mt-4` for proper icon overlap spacing

