
# Plan: Fix Navigation Arrows Visibility in Question Editor

## Problem Analysis

The navigation arrows in `GameStyleQuestionEditor.tsx` are not visible on screen despite being implemented. After analyzing the code:

1. **Current implementation** (Lines 725-744): Arrows use `fixed` positioning with `z-[60]`
2. **Parent structure** (Line 663): The component is a `motion.div` with `fixed inset-0 z-50`
3. **Carousel container** (Line 747): Uses `overflow-hidden` which shouldn't affect fixed elements but can cause issues

The issue is likely one of:
- Arrows blend into the purple background (bg-black/40 on purple)
- Fixed positioning inside animated containers can behave unexpectedly
- The arrows might be rendering but outside the visible area

---

## Solution

Use React Portal to render the navigation arrows outside of any stacking context issues, and improve their visibility with better contrast and positioning.

### File: `src/components/social/GameStyleQuestionEditor.tsx`

#### Change 1: Render Navigation Arrows via Portal

Move arrows to render via `createPortal` to `document.body`, ensuring they're outside any container constraints.

**Replace Lines 725-744:**

```typescript
// BEFORE - Arrows inside container
{/* Navigation Arrows for All Devices */}
<>
  {/* Left Arrow */}
  <button
    onClick={() => emblaApi?.scrollPrev()}
    disabled={currentIndex === 0}
    className="fixed left-3 md:left-6 top-1/2 -translate-y-1/2 z-[60] w-11 h-11 md:w-14 md:h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-black/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
  >
    <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
  </button>
  
  {/* Right Arrow */}
  <button
    onClick={() => emblaApi?.scrollNext()}
    disabled={currentIndex >= questions.length - 1}
    className="fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-[60] w-11 h-11 md:w-14 md:h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-black/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
  >
    <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
  </button>
</>
```

```typescript
// AFTER - Arrows rendered via Portal with improved visibility
{/* Navigation Arrows - Rendered via Portal */}
{createPortal(
  <>
    {/* Left Arrow */}
    <button
      onClick={() => emblaApi?.scrollPrev()}
      disabled={currentIndex === 0}
      className="fixed left-2 top-1/2 -translate-y-1/2 z-[9999] w-12 h-12 rounded-full bg-white/90 shadow-lg border-2 border-purple-300 flex items-center justify-center text-purple-700 hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ marginTop: '-40px' }}
    >
      <ChevronLeft className="w-7 h-7" />
    </button>
    
    {/* Right Arrow */}
    <button
      onClick={() => emblaApi?.scrollNext()}
      disabled={currentIndex >= questions.length - 1}
      className="fixed right-2 top-1/2 -translate-y-1/2 z-[9999] w-12 h-12 rounded-full bg-white/90 shadow-lg border-2 border-purple-300 flex items-center justify-center text-purple-700 hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ marginTop: '-40px' }}
    >
      <ChevronRight className="w-7 h-7" />
    </button>
  </>,
  document.body
)}
```

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Rendering | Inside motion.div container | Via Portal to document.body |
| Z-index | `z-[60]` (might be blocked) | `z-[9999]` (above everything) |
| Background | `bg-black/40` (blends with purple) | `bg-white/90` (high contrast) |
| Border | `border-white/30` (subtle) | `border-2 border-purple-300` (visible) |
| Text color | `text-white` | `text-purple-700` (visible on white) |
| Size | `w-11 h-11` / `w-14 h-14` | `w-12 h-12` (consistent) |
| Position offset | None | `marginTop: '-40px'` (above center for better UX) |

---

## Expected Result

- Navigation arrows will be clearly visible on both sides of the screen
- White/purple color scheme creates high contrast against the purple background
- Portal rendering ensures no stacking context issues
- Z-index of 9999 guarantees arrows appear above all other elements
- Users can easily navigate between questions using the left/right arrows
