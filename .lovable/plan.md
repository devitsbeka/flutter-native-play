
# Plan: Add Navigation Arrows to Question Editor

## Overview

Add left and right navigation arrows to the `GameStyleQuestionEditor` component for desktop users to navigate between questions while editing. These arrows will be positioned on the sides of the content area with proper z-index management to avoid overlapping with editable answer fields.

---

## Technical Changes

### File: `src/components/social/GameStyleQuestionEditor.tsx`

#### 1. Update the Carousel Container to Support Arrow Positioning

The carousel is currently at lines 726-1001. We need to wrap it in a relative container and add arrow buttons.

**Add Navigation Arrows (after line 725, before the carousel):**

```typescript
{/* Navigation Arrows for Desktop */}
<div className="hidden md:block">
  {/* Left Arrow */}
  <button
    onClick={() => emblaApi?.scrollPrev()}
    disabled={currentIndex === 0}
    className="fixed left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
    style={{ 
      top: 'calc(50% - 60px)',  // Offset up to avoid answer area
    }}
  >
    <ChevronLeft className="w-6 h-6" />
  </button>
  
  {/* Right Arrow */}
  <button
    onClick={() => emblaApi?.scrollNext()}
    disabled={currentIndex >= questions.length - 1}
    className="fixed right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
    style={{ 
      top: 'calc(50% - 60px)',  // Offset up to avoid answer area
    }}
  >
    <ChevronRight className="w-6 h-6" />
  </button>
</div>
```

#### 2. Key Design Decisions

| Aspect | Implementation |
|--------|----------------|
| **Visibility** | `hidden md:block` - Only visible on desktop/tablet (768px+) |
| **Z-Index** | `z-30` - Above carousel content but below modals (z-50/z-60) |
| **Position** | `fixed` with offset `top: calc(50% - 60px)` to position at question card level, avoiding overlap with answer fields |
| **Styling** | Semi-transparent white with blur (`bg-white/20 backdrop-blur-sm`), matching the existing UI style |
| **States** | Disabled state with reduced opacity when at first/last question |
| **Navigation** | Uses `emblaApi.scrollPrev()` and `emblaApi.scrollNext()` for smooth carousel navigation |

#### 3. Alternative: Use Calculated Position Based on Content

For more precise positioning that adapts to content:

```typescript
{/* Desktop Navigation Arrows - positioned at question card level */}
<div className="hidden md:flex fixed inset-x-4 pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top, 8px) + 200px)' }}>
  <button
    onClick={() => emblaApi?.scrollPrev()}
    disabled={currentIndex === 0}
    className="pointer-events-auto w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
  >
    <ChevronLeft className="w-6 h-6" />
  </button>
  
  <div className="flex-1" />
  
  <button
    onClick={() => emblaApi?.scrollNext()}
    disabled={currentIndex >= questions.length - 1}
    className="pointer-events-auto w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
  >
    <ChevronRight className="w-6 h-6" />
  </button>
</div>
```

---

## Visual Layout

```text
+----------------------------------------------------------+
|  [Back]           Title                         [Delete] |
|                                                          |
|  [<]            +------------------+              [>]    |
|  Left           | Question Card    |             Right   |
|  Arrow          | - Icon           |             Arrow   |
|                 | - Question Text  |                     |
|                 +------------------+                     |
|                                                          |
|                 +------------------+                     |
|                 | Answer A (edit)  |                     |
|                 +------------------+                     |
|                 | Answer B         |                     |
|                 +------------------+                     |
|                 | Answer C         |                     |
|                 +------------------+                     |
|                 | Answer D         |                     |
|                 +------------------+                     |
|                                                          |
|               < ● ● ● ● ● >  (dots)                     |
|                                                          |
|              [      Save Button      ]                   |
+----------------------------------------------------------+
```

The arrows are positioned at the question card level (upper portion) to avoid overlapping with the editable answer fields below.

---

## Summary of Changes

| Line | Change |
|------|--------|
| ~725 (after Header Content, before Carousel) | Add desktop navigation arrows block |

---

## Expected Result

- **Desktop/Tablet (md+)**: Left and right arrow buttons appear on the sides at the question card level
- **Mobile**: No arrows shown (users swipe to navigate, existing behavior)
- **Disabled states**: Left arrow disabled on first question, right arrow disabled on last question
- **Z-index handling**: Arrows stay above content but don't interfere with input fields or modals
- **Styling**: Consistent with existing UI using semi-transparent white buttons with blur effect
