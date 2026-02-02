

# Plan: Improve Collection Card UX with Centering and Play Button

## ✅ COMPLETED

### Issues Fixed

1. **✅ Round cards clickable**: The `CollectionQuizCard` container now has `onClick` to play the quiz
2. **✅ Expanded collection centered**: Desktop/tablet shows fixed centered modal with proper scrolling
3. **✅ Play button added**: "ითამაშე" button with play icon at bottom of modal
4. **✅ Scroll issue fixed**: Modal uses `flex flex-col` with `overflow-y-auto` content area

---

## Implementation Summary

### CollectionQuizCard (Lines 103-176)
- Added `onClick={() => onPlay?.(quiz)}` to container
- Added `cursor-pointer hover:bg-muted/70 transition-colors` classes

### CollectionCard Props
- Added `isMobile?: boolean` prop
- Added `handlePlayCollection` function

### Desktop Modal (when `isExpanded && !isMobile`)
- Fixed centered modal with `fixed inset-0 z-50 flex items-center justify-center`
- Scrollable content: `flex-1 overflow-y-auto min-h-0`
- Fixed play button at bottom: `flex-shrink-0 border-t`

### Mobile Behavior
- Unchanged inline expansion
- Added play button to mobile expanded view as well
