
# Plan: Fix Card Click Behavior and Add Universal Navigation Arrows

## Overview

Two issues to fix:
1. **Card click behavior**: Clicking on a quiz card inside a collection should open the edit flow, not play the quiz
2. **Navigation arrows**: Show left/right arrows on all devices (desktop, tablet, mobile) while keeping swipe navigation

---

## Technical Changes

### File: `src/components/social/MyTriviaTab.tsx`

#### Change 1: Fix CollectionQuizCard Click Behavior (Lines 103-178)

Currently, the entire card triggers `onPlay`. Need to:
- Change the card container's `onClick` to call `onEdit` instead of `onPlay`
- Add a separate explicit Play button next to the Edit button

**Current (Line 105-106):**
```typescript
<div 
  className="flex gap-3 p-4 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors"
  onClick={() => onPlay?.(quiz)}
>
```

**New:**
```typescript
<div 
  className="flex gap-3 p-4 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors"
  onClick={() => onEdit(quiz)}
>
```

**Update buttons section (Lines 128-138)**:
Add a play button next to the edit button:

```typescript
{/* Edit button (top-right) */}
<button
  onClick={(e) => {
    e.stopPropagation();
    onEdit(quiz);
  }}
  className="absolute top-0 right-9 p-2 rounded-full hover:bg-muted transition-colors"
  aria-label="Edit trivia"
>
  <Pencil className="w-4 h-4" />
</button>

{/* Play button (top-right corner) */}
<button
  onClick={(e) => {
    e.stopPropagation();
    onPlay?.(quiz);
  }}
  className="absolute top-0 right-0 p-2 rounded-full hover:bg-muted transition-colors text-purple-500"
  aria-label="Play trivia"
>
  <Play className="w-4 h-4 fill-current" />
</button>
```

This matches the user's screenshot showing an edit button (pencil icon) and a play button (purple play icon) on the right side.

---

### File: `src/components/social/GameStyleQuestionEditor.tsx`

#### Change 2: Show Navigation Arrows on All Devices (Lines 725-750)

**Current (Line 726):**
```typescript
<div className="hidden md:block">
```

**New:**
```typescript
<div className="block">
```

Also adjust the styling for better mobile visibility:

```typescript
{/* Navigation Arrows for All Devices */}
<div className="block">
  {/* Left Arrow */}
  <button
    onClick={() => emblaApi?.scrollPrev()}
    disabled={currentIndex === 0}
    className="fixed left-2 md:left-4 z-40 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
    style={{ 
      top: 'calc(50% - 80px)',
    }}
  >
    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
  </button>
  
  {/* Right Arrow */}
  <button
    onClick={() => emblaApi?.scrollNext()}
    disabled={currentIndex >= questions.length - 1}
    className="fixed right-2 md:right-4 z-40 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
    style={{ 
      top: 'calc(50% - 80px)',
    }}
  >
    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
  </button>
</div>
```

Key changes:
- Remove `hidden md:block`, use just `block` to show on all devices
- Smaller arrows on mobile: `w-10 h-10` vs `md:w-12 md:h-12`
- Smaller icons on mobile: `w-5 h-5` vs `md:w-6 md:h-6`
- Closer to edge on mobile: `left-2` vs `md:left-4`

**Note**: Swipe navigation via Embla Carousel remains unchanged (it's the default behavior).

---

## Summary

| File | Location | Change |
|------|----------|--------|
| MyTriviaTab.tsx | Line 106 | Change `onPlay?.(quiz)` → `onEdit(quiz)` |
| MyTriviaTab.tsx | Lines 128-138 | Adjust edit button position, add play button with purple icon |
| GameStyleQuestionEditor.tsx | Line 726 | Change `hidden md:block` → `block` |
| GameStyleQuestionEditor.tsx | Lines 728-749 | Add responsive sizing for mobile arrows |

---

## Expected Result

1. **Quiz card click**: Opens the question editor (edit flow)
2. **Play button**: Dedicated play button (purple icon) to play the quiz
3. **Edit button**: Pencil icon for editing (same action as card click, but explicit)
4. **Navigation arrows**: Visible on all devices (desktop, tablet, mobile)
5. **Swipe navigation**: Still works on touch devices (Embla Carousel default)
