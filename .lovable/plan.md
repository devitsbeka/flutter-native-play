
# Plan: Fix True/False Card Height and Arrow Visibility

## Overview

Three changes needed:
1. Increase True/False button height from 90px to 120px
2. Remove navigation arrows from the game play screen (QuizPlayModal)
3. Keep navigation arrows on the question editor (already present in GameStyleQuestionEditor)

---

## Technical Changes

### 1. Increase True/False Button Height

**File: `src/components/ui/quiz-true-false-button.tsx`**

Change line 119 from `h-[90px]` to `h-[120px]`:

```typescript
// BEFORE (Line 119):
className={cn(
  "w-full relative cursor-pointer h-[90px]",
  disabled && "cursor-default",
  className
)}

// AFTER:
className={cn(
  "w-full relative cursor-pointer h-[120px]",
  disabled && "cursor-default",
  className
)}
```

This restores a taller card appearance, making the icon and text less cramped.

---

### 2. Remove Arrows from Game Screen

**File: `src/components/social/QuizPlayModal.tsx`**

Remove the entire navigation arrows block (lines 380-411):

```typescript
// DELETE THESE LINES (380-411):
{!gameComplete && !roundComplete && !allRoundsComplete && questions.length > 1 && (
  <>
    {/* Left Arrow - Go to previous question ... */}
    <button ... >
      <ChevronLeft ... />
    </button>
    
    {/* Right Arrow - Skip to next question ... */}
    <button ... >
      <ChevronRight ... />
    </button>
  </>
)}
```

The game screen doesn't need navigation arrows - players should answer questions in sequence.

---

### 3. Verify Edit Screen Arrows (Already Present)

**File: `src/components/social/GameStyleQuestionEditor.tsx`**

The arrows are already implemented at lines 725-750 with `className="block"` (visible on all devices). No changes needed here.

---

## Summary

| File | Change |
|------|--------|
| `quiz-true-false-button.tsx` | Increase height: `h-[90px]` → `h-[120px]` |
| `QuizPlayModal.tsx` | Remove navigation arrows block (lines 380-411) |
| `GameStyleQuestionEditor.tsx` | No changes - arrows already present on all devices |

---

## Expected Result

- **True/False buttons**: Taller (120px) with more breathing room for icon and text
- **Game screen**: No navigation arrows - clean gameplay experience
- **Edit screen**: Navigation arrows visible on all devices (mobile, tablet, desktop) + swipe still works
