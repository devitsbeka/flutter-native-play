

# Plan: Fix My Powers Section Visibility & Layout

## Problem Analysis

From the screenshot and code investigation, two issues are preventing the "My Powers" section from displaying correctly:

### Issue 1: Z-Index Stacking
The `GlobalSplineBackground` component uses fixed positioning with z-index values 0-3. The `MyPowersSection` content doesn't have a higher z-index, so it's being rendered behind the background layers.

**Current z-index hierarchy:**
```text
z-0  → Video background (fixed)
z-1  → White radial mask (fixed)
z-2  → Floating orbs (fixed)
z-3  → Sparkle particles (fixed)
???  → MyPowersSection (no z-index = behind everything)
```

### Issue 2: Layout Structure
The user also wants the "+" buttons positioned below the power-up icons instead of inline. This will help fit all 4 powers without horizontal scrolling.

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/MyPowersSection.tsx` | Add z-index to container, restructure layout to show + button below each power |

---

## Technical Changes

### 1. Add z-index to ensure visibility

```tsx
// Add relative positioning and z-index above background
<div className="px-4 py-4 relative z-10">
```

### 2. Restructure layout: Power icons in grid, + buttons below

**Current layout (horizontal scroll):**
```text
[Icon + Count + Button] [Icon + Count + Button] [Icon + Count + Button] →
```

**New layout (vertical stacking, no scroll):**
```text
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Icon │ │ Icon │ │ Icon │ │ Icon │
│  45  │ │  49  │ │  11  │ │  22  │
│ [+]  │ │ [+]  │ │ [+]  │ │ [+]  │
└──────┘ └──────┘ └──────┘ └──────┘
```

**Updated JSX structure:**
```tsx
<div className="px-4 py-4 relative z-10">
  <h2 className="text-lg font-bold text-foreground mb-3">ჩემი ძალები</h2>
  
  {/* Grid layout - 4 columns, no scroll */}
  <div className="grid grid-cols-4 gap-3">
    {POWER_UP_ORDER.map((type) => {
      const count = safeData[type] ?? 0;
      const isLoading = isPurchasing === `single_${type}`;
      
      return (
        <div
          key={type}
          className="flex flex-col items-center gap-2 px-3 py-3 rounded-2xl bg-card border border-border shadow-sm"
        >
          {/* Power icon */}
          <img 
            src={POWER_UP_ICONS[type]} 
            alt="" 
            className="w-10 h-10 object-contain" 
          />
          
          {/* Count */}
          <span className="font-bold text-lg text-foreground">
            {count}
          </span>
          
          {/* Add button - now below */}
          <button
            onClick={() => onPurchaseSingle(type)}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      );
    })}
  </div>
</div>
```

---

## Visual Result

```text
┌─────────────────────────────────────┐
│     PRO Carousel                    │
├─────────────────────────────────────┤
│ ჩემი ძალები                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │ 🎯  │ │ ❄️  │ │ 🔄  │ │ ⏱️  │    │
│ │ 45  │ │ 49  │ │ 11  │ │ 22  │    │
│ │ [+] │ │ [+] │ │ [+] │ │ [+] │    │
│ └─────┘ └─────┘ └─────┘ └─────┘    │
├─────────────────────────────────────┤
│ ძალები                              │
│ [Power Pack Cards...]               │
└─────────────────────────────────────┘
```

---

## Summary

1. **Add `relative z-10`** to the container to stack above the fixed background layers
2. **Change from horizontal flex to 4-column grid** to fit all powers without scrolling
3. **Stack content vertically** within each card: icon → count → + button

