

# Plan: Change "Add Round" Button Text

## Overview

Update the "Add Round" button text from "კიდევ დამატება" (Add more) to "რაუნდის დამატება" (Add round) in both the desktop modal and mobile inline views.

---

## Technical Changes

### File: `src/components/social/MyTriviaTab.tsx`

#### Change 1: Desktop Modal View (Line 391)

```typescript
// BEFORE (Line 391):
<span className="text-sm font-medium">კიდევ დამატება</span>

// AFTER:
<span className="text-sm font-medium">რაუნდის დამატება</span>
```

#### Change 2: Mobile Inline View (Line 596)

```typescript
// BEFORE (Line 596):
<span className="text-sm font-medium">კიდევ დამატება</span>

// AFTER:
<span className="text-sm font-medium">რაუნდის დამატება</span>
```

---

## Summary

| Location | Line | Change |
|----------|------|--------|
| Desktop modal | 391 | "კიდევ დამატება" → "რაუნდის დამატება" |
| Mobile inline | 596 | "კიდევ დამატება" → "რაუნდის დამატება" |

---

## Expected Result

Both the expanded collection modal on desktop/tablet and the inline expanded collection on mobile will show "რაუნდის დამატება" (Add round) instead of "კიდევ დამატება" (Add more) for the button that adds new rounds to a collection.

