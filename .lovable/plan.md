
# Plan: Fix Logo Size and Wrapping on Desktop/Tablet

## Problem Analysis

Looking at the screenshot, the logo in TeamV2.tsx shows:
1. **Size is too large**: Using `lg` (40px font) on desktop instead of `md` (28px)
2. **LIVE badge wraps below**: The container doesn't provide enough space to keep elements on one line

### Root Cause

In `MyTriviaLiveLogo.tsx`, when `responsive={true}`:
- Desktop (lg, xl, 2xl breakpoints) → uses `"lg"` size (40px font) - **too large**
- Tablet (md breakpoint) → uses `"sm"` size (20px font) - correct

The wrapping happens because the parent container `<div className="flex items-center gap-2">` doesn't guarantee minimum width for the logo.

---

## Technical Changes

### File 1: `src/components/shared/MyTriviaLiveLogo.tsx`

**Change 1 (Lines 33-35)**: Update responsive sizing to use `md` on desktop instead of `lg`

```typescript
// BEFORE:
} else {
  effectiveSize = "lg";  // Desktop (lg, xl, 2xl)
}

// AFTER:
} else {
  effectiveSize = "md";  // Desktop (lg, xl, 2xl) - md not lg
}
```

### File 2: `src/pages/TeamV2.tsx`

**Change 2 (Lines 508-511)**: Give the logo container explicit minimum width to prevent wrapping

```typescript
// BEFORE:
<div className="flex items-center justify-between mb-3 pb-3 border-b border-purple-900/10">
  <div className="flex items-center gap-2">
    <MyTriviaLiveLogo responsive />
  </div>

// AFTER:
<div className="flex items-center justify-between mb-3 pb-3 border-b border-purple-900/10">
  <div className="flex items-center gap-2 shrink-0">
    <MyTriviaLiveLogo responsive />
  </div>
```

The key addition is `shrink-0` which prevents the logo container from shrinking below its natural width, which forces other elements to shrink instead.

---

## Summary

| Location | Before | After | Purpose |
|----------|--------|-------|---------|
| MyTriviaLiveLogo.tsx (line 34) | `effectiveSize = "lg"` | `effectiveSize = "md"` | Use medium (28px) not large (40px) on desktop |
| TeamV2.tsx (line 509) | `flex items-center gap-2` | `flex items-center gap-2 shrink-0` | Prevent container from shrinking and causing wrap |

---

## Visual Result

**Before (Desktop):**
```text
MyTrivia     ← 40px font (lg size)
● LIVE       ← badge wraps to second line
```

**After (Desktop):**
```text
MyTrivia ● LIVE   ← 28px font (md size), all on one line
```

**Tablet remains at sm (20px):**
```text
MyTrivia ● LIVE   ← 20px font, all on one line
```
