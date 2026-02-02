

# Plan: Fix Logo Always on One Line

## Problem

The "MyTrivia LIVE" logo is wrapping to two lines because:
1. The logo container doesn't have a fixed/auto width
2. Parent flex containers with `flex-1` can squeeze the logo container
3. Even with `flex-nowrap`, the container itself can be compressed

## Solution

Add `w-auto` (width: auto) to the logo container to ensure it maintains its natural width and doesn't get compressed by parent flex layouts.

---

## Technical Changes

### File: `src/components/shared/MyTriviaLiveLogo.tsx`

**Line 42** - Add `w-auto` to force auto width:

```typescript
// BEFORE:
<div className={`flex items-center gap-2 flex-nowrap shrink-0 ${className}`}>

// AFTER:
<div className={`flex items-center gap-2 flex-nowrap shrink-0 w-auto ${className}`}>
```

Additionally, add `min-w-fit` to ensure the container never shrinks below its content size:

```typescript
// FINAL:
<div className={`flex items-center gap-2 flex-nowrap shrink-0 w-auto min-w-fit ${className}`}>
```

---

## Summary

| Property | Purpose |
|----------|---------|
| `flex-nowrap` | Prevent internal flex items from wrapping |
| `shrink-0` | Prevent container from shrinking in flex parent |
| `w-auto` | Force container to take natural content width |
| `min-w-fit` | Ensure minimum width fits the content |

---

## Visual Result

**Before:**
```text
MyTrivia
[LIVE]     ← Badge wraps to second line
```

**After:**
```text
MyTrivia [LIVE]     ← Always stays on one line
```

