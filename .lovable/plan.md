

# Plan: Style "+" Button with Divider and Purple Outline

## Problem Analysis

From the reference image, the "+" buttons should have:
1. A horizontal divider line separating them from the count above
2. Transparent background instead of solid purple
3. Purple border/stroke around the button
4. Purple "+" icon instead of white

## Current vs Target

```text
Current:                      Target:
┌─────┐                       ┌─────┐
│ 🎯  │                       │ 🎯  │
│ 46  │                       │ 46  │
│[██+]│ ← solid bg            │─────│ ← divider line
└─────┘                       │(+) │ ← transparent bg, purple border
                              └─────┘
```

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Add divider, update button styling to transparent with purple border |

---

## Technical Changes

### Update button container and styling

```tsx
{/* Add divider above button */}
<div className="w-full h-px bg-border my-1" />

{/* Update button: transparent bg, purple border, purple icon */}
<button
  onClick={() => onPurchaseSingle(type)}
  disabled={isLoading}
  className="w-8 h-8 rounded-full bg-transparent border-2 border-primary flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
>
  {isLoading ? (
    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  ) : (
    <Plus className="w-4 h-4" />
  )}
</button>
```

### Key styling changes:
- **Divider**: `<div className="w-full h-px bg-border my-1" />` - thin horizontal line
- **Button background**: `bg-transparent` instead of `bg-primary`
- **Button border**: `border-2 border-primary` for purple stroke
- **Icon color**: `text-primary` instead of `text-primary-foreground` for purple "+"
- **Hover state**: `hover:bg-primary/10` for subtle feedback
- **Loading spinner**: Updated border color to `border-primary` for consistency

---

## Visual Result

```text
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ 🎯  │ │ ❄️  │ │ 🔄  │ │ ⏱️  │
│ 46  │ │ 49  │ │ 11  │ │ 22  │
│─────│ │─────│ │─────│ │─────│
│ (+) │ │ (+) │ │ (+) │ │ (+) │
└─────┘ └─────┘ └─────┘ └─────┘
     ↑ transparent bg, purple border & icon
```

---

## Summary

1. Add horizontal divider line (`h-px bg-border`) above each "+" button
2. Change button from solid purple to transparent with purple border
3. Change "+" icon from white to purple

