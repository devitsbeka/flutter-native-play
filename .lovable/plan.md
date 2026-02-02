
# Plan: Fix Logo Always on One Line

## Problem Analysis

Looking at the screenshot, the logo shows:
- "MyTrivia" on line 1
- "● LIVE" badge on line 2

This happens despite the `MyTriviaLiveLogo` component having `flex-nowrap` and `shrink-0`. The issue is that these flexbox properties don't always prevent wrapping when the parent container has `min-w-0` (which allows content to shrink below its natural size).

## Root Cause

In `Index.tsx` line 434:
```typescript
<div className="flex-1 flex justify-center md:justify-start items-center gap-4 min-w-0">
```

The `min-w-0` allows the flex child to shrink to 0 width, which can cause its children to wrap even if they have `flex-nowrap`.

---

## Technical Changes

### File 1: `src/components/shared/MyTriviaLiveLogo.tsx`

**Change (Line 42)**: Add explicit minimum width using CSS calc to guarantee enough space for text + badge:

```typescript
// BEFORE:
<div className={`inline-flex items-center gap-2 flex-nowrap shrink-0 w-auto min-w-fit whitespace-nowrap ${className}`}>

// AFTER:
<div 
  className={`inline-flex items-center gap-2 shrink-0 whitespace-nowrap ${className}`}
  style={{ minWidth: 'max-content' }}
>
```

The key change is using `style={{ minWidth: 'max-content' }}` which is more reliable than `min-w-fit` in flex contexts. This ensures the container never shrinks below the combined width of its content.

### File 2: `src/pages/Index.tsx`

**Change (Lines 434-441)**: Remove `min-w-0` which was allowing shrinkage, and ensure the logo container is always protected:

```typescript
// BEFORE:
<div className="flex-1 flex justify-center md:justify-start items-center gap-4 min-w-0">
  {/* Logo - sm on mobile/tablet, md on desktop - single line always */}
  <div className="flex-shrink-0">
    <MyTriviaLiveLogo size="sm" className="md:hidden" />
    <MyTriviaLiveLogo size="sm" className="hidden md:block lg:hidden" />
    <MyTriviaLiveLogo size="md" className="hidden lg:block" />
  </div>
</div>

// AFTER:
<div className="flex-1 flex justify-center md:justify-start items-center gap-4">
  {/* Logo - sm on mobile/tablet, md on desktop - single line always */}
  <div className="shrink-0" style={{ minWidth: 'max-content' }}>
    <MyTriviaLiveLogo size="sm" className="md:hidden" />
    <MyTriviaLiveLogo size="sm" className="hidden md:block lg:hidden" />
    <MyTriviaLiveLogo size="md" className="hidden lg:block" />
  </div>
</div>
```

Key changes:
1. Remove `min-w-0` from parent - this was the main culprit allowing shrinkage
2. Add `minWidth: 'max-content'` to the logo container div for extra protection

---

## Summary

| File | Line | Change | Purpose |
|------|------|--------|---------|
| MyTriviaLiveLogo.tsx | 42 | Add `minWidth: 'max-content'` style | Prevent internal wrapping |
| Index.tsx | 434 | Remove `min-w-0` | Stop parent from allowing child shrinkage |
| Index.tsx | 436 | Add `minWidth: 'max-content'` style | Double protection for logo container |

---

## Visual Result

**Before:**
```text
MyTrivia     ← Text on line 1
● LIVE       ← Badge wraps to line 2
```

**After:**
```text
MyTrivia ● LIVE   ← Everything on one line, always
```
