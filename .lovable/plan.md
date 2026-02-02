
# Plan: Add Power-Ups Summary Next to "ძალები" Section Title

## Overview

Add a compact power-ups summary display showing each power-up type with its icon and count next to the "ძალები" (Powers) section title on the shop page, similar to how coins and gems are displayed in the header.

---

## Visual Design

**Current:**
```
ძალები
┌─────────┐ ┌─────────┐ ┌─────────┐
│ 50/50   │ │ გაყინვა │ │ შეცვლა │
└─────────┘ └─────────┘ └─────────┘
```

**After:**
```
ძალები   [🔴 2] [❄️ 1] [🔄 1] [⏰ 1]
┌─────────┐ ┌─────────┐ ┌─────────┐
│ 50/50   │ │ გაყინვა │ │ შეცვლა │
└─────────┘ └─────────┘ └─────────┘
```

The summary will use small rounded chips with the power-up icon and count, styled similarly to the header currency display.

---

## Technical Changes

### File 1: Create `src/components/shop/PowerUpsSummary.tsx` (NEW)

A compact inline component to display all 4 power-up types with their counts.

```typescript
// Component structure:
// - Uses useUserPowerUps hook for counts
// - Displays 4 chips in a horizontal row
// - Each chip: icon (16x16) + count
// - Small, unobtrusive styling matching header currency style
```

**Key elements:**
- Import power-up icons from `@/assets/powers/`
- Use `useUserPowerUps` hook to get current counts
- Compact chip design: `w-6 h-6` icon container + count text
- Horizontal flex layout with small gap

---

### File 2: Modify `src/components/shop/ShopProductGrid.tsx`

Update the section header to conditionally show the power-ups summary for the "powers" section.

**Changes:**
1. Accept optional `sectionId` prop
2. Import and render `PowerUpsSummary` when `sectionId === "powers"`
3. Update header layout to accommodate inline summary

```typescript
// Line 35-39 - Update section header:
<div className="px-[15px] mb-3">
  <div className="flex items-center gap-3">
    <h2 className="text-lg font-display font-bold text-foreground/90 drop-shadow-sm">
      {title}
    </h2>
    {sectionId === "powers" && <PowerUpsSummary />}
  </div>
</div>
```

---

### File 3: Modify `src/components/shop/ShopStandardLayout.tsx`

Pass the `sectionId` prop to `ShopProductGrid`:

```typescript
// Line 82-90 - Add sectionId prop:
<ShopProductGrid
  sectionId={section.id}  // NEW
  title={section.title}
  items={section.items}
  gems={gems}
  ...
/>
```

---

## Component Design: PowerUpsSummary

```typescript
// Icon order: 5050, freeze, replace, time-drain
// Style: Similar to header currency chips

const powerTypes = ["5050", "freeze", "replace", "time-drain"];

// Each chip:
<div className="flex items-center gap-1">
  <img src={icon} className="w-4 h-4" />
  <span className="text-xs font-bold">{count}</span>
</div>
```

**Styling approach:**
- Small rounded container (similar to header currency display)
- Icon size: 16x16 pixels
- Count text: `text-xs font-bold`
- Gap between chips: `gap-2`
- Optional: subtle background/border for visibility

---

## Summary

| File | Action |
|------|--------|
| `src/components/shop/PowerUpsSummary.tsx` | CREATE - New compact power-ups display component |
| `src/components/shop/ShopProductGrid.tsx` | EDIT - Add sectionId prop, render summary for powers section |
| `src/components/shop/ShopStandardLayout.tsx` | EDIT - Pass sectionId to ShopProductGrid |

This adds a quick-glance view of the user's current power-up inventory right where they're shopping for more, helping them make informed purchase decisions.
