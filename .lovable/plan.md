

# Plan: Position Power Icons Overlaying Top of Cards

## Visual Reference

From the screenshots, the icon should be positioned so it overlaps the top edge of the card:

```text
Current:                     Target:
┌────────────┐               ┌─────🎯─────┐  ← 50% of icon above card
│    🎯      │               │     ▼      │  ← 50% of icon inside card
│    32      │               │            │
│   (+)      │               │    32      │
└────────────┘               │   (+)      │
                             └────────────┘
```

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Use relative positioning with negative margin to overlay icon |

---

## Technical Changes

### 1. Add top margin to grid for icon overflow space

The grid container needs extra top margin to allow icons to extend above:

```tsx
// Before:
<div className="grid grid-cols-4 gap-3">

// After:
<div className="grid grid-cols-4 gap-3 mt-6">
```

### 2. Use relative positioning on card with icon overlay

Make the card a positioning context and position the icon with negative top margin:

```tsx
<div
  key={type}
  className="relative flex flex-col items-center gap-3 px-3 pt-8 pb-4 rounded-2xl liquid-glass"
>
  {/* Icon positioned at top edge, 50% above card */}
  <img 
    src={POWER_UP_ICONS[type]} 
    alt="" 
    className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 object-contain" 
  />
  
  {/* Count and button remain as flex children */}
  <span className="font-bold text-lg text-foreground">
    {count}
  </span>
  <button>...</button>
</div>
```

### Key styling changes:
- **`relative`** on card - establishes positioning context
- **`absolute -top-6 left-1/2 -translate-x-1/2`** on icon - centers horizontally and positions 50% above card (6 = half of 12 = 48px/2 = 24px)
- **`pt-8`** on card - adds top padding to make room for where icon overlaps inside
- **`mt-6`** on grid - provides space above cards for icon overflow

---

## Visual Result

```text
                 🎯               ❄️               🔄               ⏱️
         ┌───────────────┬───────────────┬───────────────┬───────────────┐
         │               │               │               │               │
         │      32       │      32       │      32       │      32       │
         │               │               │               │               │
         │     ( + )     │     ( + )     │     ( + )     │     ( + )     │
         └───────────────┴───────────────┴───────────────┴───────────────┘
                     ↑ Icons overlapping top edge of cards
```

---

## Summary

1. Add `relative` positioning to cards
2. Position icons with `absolute -top-6` to overlay 50% above card edge
3. Add `pt-8` padding inside card for icon overlap area
4. Add `mt-6` margin on grid to prevent clipping

