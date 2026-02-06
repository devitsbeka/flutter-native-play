
# Plan: Match My Powers Card Style to Shop Cards

## Problem Analysis

From the reference images, the "My Powers" (ჩემი ძალები) cards should use the same transparent glass styling as the power pack cards below in the "ძალები" section.

**Current styling:**
- `bg-card border border-border shadow-sm` - solid background, visible border

**Target styling:**
- `liquid-glass` class - semi-transparent with blur effect, matching the shop item cards

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Replace solid card styling with `liquid-glass` class |

---

## Technical Changes

The existing `liquid-glass` class in `src/index.css` provides:
- Semi-transparent white gradient background (65% → 55% → 60% opacity)
- Backdrop blur effect (20px blur + 180% saturation)
- Subtle white border (50% opacity)
- Inner shadow highlights

### Code Change

```tsx
// Current:
<div
  key={type}
  className="flex flex-col items-center gap-2 px-3 py-3 rounded-2xl bg-card border border-border shadow-sm"
>

// Updated:
<div
  key={type}
  className="flex flex-col items-center gap-2 px-3 py-3 rounded-2xl liquid-glass"
>
```

This single class change will apply all the styling needed:
- Transparent background with blur
- Proper border styling
- Shadow effects
- Dark mode support (automatically handled by `.dark .liquid-glass`)

---

## Visual Result

```text
Before (solid):              After (glass effect):
┌─────────┐                  ┌─────────┐
│█████████│                  │░░░░░░░░░│ ← transparent blur
│█ Icon ██│                  │░ Icon ░░│
│█  46  ██│                  │░  46  ░░│
│█─────███│                  │░─────░░░│
│█ (+) ███│                  │░ (+) ░░░│
└─────────┘                  └─────────┘
```

---

## Summary

1. Replace `bg-card border border-border shadow-sm` with `liquid-glass` class
2. This ensures consistent styling across all shop components
3. Automatically includes dark mode support
