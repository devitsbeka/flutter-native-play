
# Plan: Fix Logo to Always Display on One Line with Correct Size on Tablet

## Problem Analysis

Looking at the screenshots:
1. **Screenshot #1 & #2 (Tablet)**: The "MyTrivia" text and "LIVE" badge are on separate lines, and the logo is using `md` size (28px font) instead of `sm` (20px)
2. **Screenshot #3 (Mobile)**: Correctly shows small logo on one line

### Root Causes

**Issue 1: Wrong size on tablet**
In `MyTriviaLiveLogo.tsx`, when `responsive={true}` is used:
- Tablet (`md` breakpoint) → uses `"md"` size (28px font)
- But user wants tablet to use `"sm"` size (20px font) like mobile

**Issue 2: Logo wrapping to two lines**
Despite having `flex-nowrap`, `shrink-0`, `w-auto`, and `min-w-fit` on the container, the logo still wraps because the **LiveBadge component wraps as an inline element**.

---

## Technical Changes

### File: `src/components/shared/MyTriviaLiveLogo.tsx`

**Change 1 (Line 31-32)**: Change tablet breakpoint to use `sm` size instead of `md`

```typescript
// BEFORE:
} else if (breakpoint === "md") {
  effectiveSize = "md";  // Tablet

// AFTER:
} else if (breakpoint === "md") {
  effectiveSize = "sm";  // Tablet (same as mobile)
```

**Change 2 (Line 42)**: Add `inline-flex` and `whitespace-nowrap` to ensure the entire logo stays on one line

```typescript
// BEFORE:
<div className={`flex items-center gap-2 flex-nowrap shrink-0 w-auto min-w-fit ${className}`}>

// AFTER:
<div className={`inline-flex items-center gap-2 flex-nowrap shrink-0 w-auto min-w-fit whitespace-nowrap ${className}`}>
```

The key addition is `inline-flex` (instead of `flex`) which prevents the container from taking full width, and explicit `whitespace-nowrap` which ensures no text/inline elements wrap.

---

## Summary

| Change | Before | After | Purpose |
|--------|--------|-------|---------|
| Tablet size | `"md"` (28px) | `"sm"` (20px) | Match mobile size on tablet |
| Container display | `flex` | `inline-flex` | Prevent full-width expansion |
| Container whitespace | (none) | `whitespace-nowrap` | Ensure no wrapping |

---

## Visual Result

**Before (Tablet):**
```text
MyTrivia   ← 28px font (md)
● LIVE     ← badge on second line
```

**After (Tablet):**
```text
MyTrivia ● LIVE   ← 20px font (sm), all on one line
```
