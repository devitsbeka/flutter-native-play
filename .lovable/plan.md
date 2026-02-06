

# Plan: Match My Powers Section to Reference Design

## Visual Comparison

```text
Current (Screen 1):          Target (Screen 2):
┌────────┐                   ┌────────┐
│  🎯    │                   │        │
│  46    │                   │  🎯    │  ← Larger icon, more top padding
│────────│ ← divider         │        │
│  (+)   │                   │  32    │  ← More space between icon and count
└────────┘                   │        │
                             │  (+)   │  ← No divider, more spacing
                             │        │
                             └────────┘  ← Taller overall card
```

---

## Changes Required

| Element | Current | Target |
|---------|---------|--------|
| Icon size | `w-10 h-10` (40px) | `w-12 h-12` (48px) |
| Divider | Present | **Remove** |
| Card padding | `px-3 py-3` | `px-3 py-4` (more vertical) |
| Gap between items | `gap-2` | `gap-3` (more spacing) |
| Button size | `w-8 h-8` | `w-9 h-9` (slightly larger) |
| Button border | `border-2` | `border-[1.5px]` (thinner stroke) |

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Remove divider, adjust sizing and spacing |

---

## Technical Changes

### Updated card structure

```tsx
<div
  key={type}
  className="flex flex-col items-center gap-3 px-3 py-4 rounded-2xl liquid-glass"
>
  {/* Larger icon */}
  <img 
    src={POWER_UP_ICONS[type]} 
    alt="" 
    className="w-12 h-12 object-contain" 
  />
  
  {/* Count - no changes */}
  <span className="font-bold text-lg text-foreground">
    {count}
  </span>
  
  {/* NO DIVIDER - removed */}
  
  {/* Slightly larger button with thinner border */}
  <button
    onClick={() => onPurchaseSingle(type)}
    disabled={isLoading}
    className="w-9 h-9 rounded-full bg-transparent border-[1.5px] border-primary flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
  >
    {isLoading ? (
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    ) : (
      <Plus className="w-4 h-4" />
    )}
  </button>
</div>
```

### Key styling changes:
- **Remove divider line** - no more `<div className="w-full h-px bg-border my-1" />`
- **Increase icon size** from `w-10 h-10` to `w-12 h-12`
- **Increase gap** from `gap-2` to `gap-3` for better spacing between elements
- **Add vertical padding** from `py-3` to `py-4` for taller cards
- **Slightly larger button** from `w-8 h-8` to `w-9 h-9`
- **Thinner border** from `border-2` to `border-[1.5px]` for a more refined look

---

## Visual Result

```text
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│        │ │        │ │        │ │        │
│   🎯   │ │   ❄️   │ │   🔄   │ │   ⏱️   │
│        │ │        │ │        │ │        │
│   32   │ │   32   │ │   32   │ │   32   │
│        │ │        │ │        │ │        │
│  ( + ) │ │  ( + ) │ │  ( + ) │ │  ( + ) │
│        │ │        │ │        │ │        │
└────────┘ └────────┘ └────────┘ └────────┘
    ↑ Cleaner, more spacious cards matching Screen 2
```

---

## Summary

1. Remove the horizontal divider between count and button
2. Increase icon size to 48px
3. Add more vertical padding and gaps for a taller, more elegant card
4. Make button slightly larger with thinner border stroke

