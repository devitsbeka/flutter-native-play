

# Plan: Fix Logo Position Jump Between Pages

## Problem Analysis

When navigating between pages, the logo jumps position due to inconsistent header implementations:

**Index.tsx (Home Page):**
```
Header: px-4 py-3, border-b
├── Left: burger menu (mobile) - 40px width
├── Center: flex-1 with justify-center on mobile, justify-start on desktop
│   └── MyTriviaLiveLogo
└── Right: Search + Bell icons
```

**TeamV2.tsx (Team Page):**
```
Header: px-4 pt-4 pb-2 mb-3 pb-3, border-b
├── Left: gap-2 shrink-0
│   └── MyTriviaLiveLogo (always left-aligned, no centering)
└── Right: QR Scanner + Bell icons
```

### Key Differences Causing the Jump:
| Aspect | Index.tsx | TeamV2.tsx |
|--------|-----------|------------|
| Vertical Padding | `py-3` (12px each) | `pt-4 pb-2` (16px + 8px) + `mb-3 pb-3` |
| Logo Container | `flex-1 justify-center md:justify-start` | `shrink-0` (always left) |
| Left Element | Burger menu (mobile only) | None on desktop |
| Desktop Layout | Logo after invisible left div | Logo directly at left edge |

---

## Solution: Standardize Header Layout

Create consistent header styling across both pages:

1. **Same vertical padding**: Use `py-3` on both pages
2. **Same logo positioning logic**: Logo should be left-aligned on desktop/tablet, with same starting position
3. **Same layout structure**: Three-column flex with consistent widths

---

## Technical Changes

### File 1: `src/pages/TeamV2.tsx`

**Lines 507-556**: Update header structure to match Index.tsx layout

Current structure:
```typescript
<div className="px-4 pt-4 pb-2">
  <div className="flex items-center justify-between mb-3 pb-3 border-b border-purple-900/10">
    <div className="flex items-center gap-2 shrink-0">
      <MyTriviaLiveLogo responsive />
    </div>
    <div className="flex items-center gap-2">
      {/* buttons */}
    </div>
  </div>
```

New structure (matching Index.tsx):
```typescript
<div className="px-4 py-3 border-b border-purple-900/10">
  <div className="flex items-center justify-between gap-3">
    {/* Left placeholder for symmetry (empty on desktop, could have burger on mobile) */}
    <div className="flex items-center gap-2 w-0 md:w-0" />
    
    {/* Center: Logo - same flex-1 + justify-start as Index */}
    <div className="flex-1 flex justify-center md:justify-start items-center gap-4">
      <MyTriviaLiveLogo responsive />
    </div>
    
    {/* Right: Action buttons */}
    <div className="flex items-center gap-2">
      {/* QR Scanner, Bell, etc. */}
    </div>
  </div>
</div>
```

Key changes:
- Change padding from `pt-4 pb-2` to `py-3` (matches Index.tsx)
- Remove nested `div` with `mb-3 pb-3` 
- Add same `flex-1 justify-center md:justify-start` wrapper for logo
- Add empty left placeholder div to maintain the three-column structure

---

### File 2: `src/pages/Index.tsx` (minor adjustment)

**Lines 416-436**: The header structure is already correct. Only need to ensure the left placeholder doesn't shift things on tablet.

Current:
```typescript
<div className="flex items-center gap-2">
  {/* Burger Menu - Mobile Only */}
  {user && (
    <motion.button className="md:hidden ...">
```

The issue: On tablet/desktop (md+), this div is empty but still takes up space due to `gap-2`.

Fix: Add `min-w-0` to the left div OR ensure TeamV2 matches the same empty div behavior.

Actually, since the burger is `md:hidden`, on md+ the left div is effectively empty. We need to ensure TeamV2 has the same left spacing behavior.

---

## Summary

| File | Line | Change |
|------|------|--------|
| TeamV2.tsx | 507 | Change `pt-4 pb-2` to `py-3` |
| TeamV2.tsx | 508 | Remove `mb-3 pb-3` from inner div, add `gap-3` |
| TeamV2.tsx | 509-511 | Wrap logo in `flex-1 justify-center md:justify-start` container |
| TeamV2.tsx | 508 | Add empty left placeholder div to match Index.tsx structure |

---

## Expected Result

After these changes:
- Logo will be in the **exact same position** on both pages
- No visual jump when navigating between Home and Team pages
- Consistent vertical spacing (12px top + 12px bottom = 48px total header height)
- Logo left-aligned on desktop/tablet on both pages

