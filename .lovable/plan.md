
# Plan: Collection Card UI Improvements

## Overview

The user wants the following changes:
1. **Keep AddRound modal in place** - Don't navigate to full-screen page when adding rounds; stay in the collection modal
2. **Remove collection badge from cover image** - Remove the duplicate badge shown on the cover
3. **Change collection badge to gradient** - Use orange/purple/blue gradient instead of solid purple
4. **Move "რაუნდის დამატება" above rounds list** - Show add round button at the top, not bottom

---

## Technical Changes

### File: `src/components/social/MyTriviaTab.tsx`

#### Change 1: Remove Collection Badge from Cover Image (Desktop Modal)

**Location: Lines 294-298** - Remove the badge from the cover image header

```typescript
// DELETE these lines (294-298):
{/* Collection Badge */}
<div className="absolute top-3 left-14 flex h-8 items-center gap-1.5 bg-purple-600/90 text-white px-3 rounded-full text-xs font-semibold shadow-md">
  <Layers className="w-3.5 h-3.5" />
  <span>კოლექცია</span>
</div>
```

#### Change 2: Remove Collection Badge from Cover Image (Mobile Card)

**Location: Lines 428-432** - Remove the badge from the collapsed card cover

```typescript
// DELETE these lines (428-432):
{/* Collection Badge */}
<div className="absolute top-3 left-14 flex h-8 items-center gap-1.5 bg-purple-600/90 text-white px-3 rounded-full text-xs font-semibold shadow-md">
  <Layers className="w-3.5 h-3.5" />
  <span>კოლექცია</span>
</div>
```

#### Change 3: Change Collection Badge to Gradient (Desktop Modal Info Row)

**Location: Lines 315-319** - Update the badge in the info row below the cover

```typescript
// BEFORE:
<div className="flex items-center gap-2 bg-purple-500 text-white rounded-full px-3 py-1.5">
  <Layers className="w-4 h-4" />
  <span className="text-sm font-medium">კოლექცია</span>
</div>

// AFTER:
<div 
  className="flex items-center gap-2 text-white rounded-full px-3 py-1.5"
  style={{ background: "linear-gradient(135deg, #F97316 0%, #8B5CF6 50%, #3B82F6 100%)" }}
>
  <Layers className="w-4 h-4" />
  <span className="text-sm font-medium">კოლექცია</span>
</div>
```

#### Change 4: Change Collection Badge to Gradient (Mobile Card Info Row)

**Location: Lines 459-463** - Update the badge in the collapsed card info row

```typescript
// BEFORE:
<div className="flex items-center gap-2 bg-purple-500 text-white rounded-full px-3 py-1.5">
  <Layers className="w-4 h-4" />
  <span className="text-sm font-medium">კოლექცია</span>
</div>

// AFTER:
<div 
  className="flex items-center gap-2 text-white rounded-full px-3 py-1.5"
  style={{ background: "linear-gradient(135deg, #F97316 0%, #8B5CF6 50%, #3B82F6 100%)" }}
>
  <Layers className="w-4 h-4" />
  <span className="text-sm font-medium">კოლექცია</span>
</div>
```

#### Change 5: Move "რაუნდის დამატება" Above Rounds List (Desktop Modal)

**Location: Lines 332-367** - Restructure the rounds section

```typescript
// BEFORE structure:
<div className="p-4 space-y-2">
  {/* Loading / Quizzes list */}
  ...quizzes.map(...)
  
  {/* Add More Button - AT BOTTOM */}
  <button onClick={...}>რაუნდის დამატება</button>
</div>

// AFTER structure:
<div className="p-4 space-y-2">
  {/* Add Round Button - NOW AT TOP */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      const nextRoundNumber = (quizzes?.length || 0) + 1;
      onAddRound(collection.id, nextRoundNumber);
    }}
    className="w-full py-3 rounded-xl border-2 border-dashed border-muted-foreground/30 
               bg-muted/30 hover:bg-muted/50 transition-colors 
               flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
  >
    <Plus className="w-4 h-4" />
    <span className="text-sm font-medium">რაუნდის დამატება</span>
  </button>
  
  {/* Loading / Quizzes list */}
  ...quizzes.map(...)
  
  {/* REMOVE the button from bottom */}
</div>
```

#### Change 6: Move "რაუნდის დამატება" Above Rounds List (Mobile Expanded)

**Location: Lines 513-547** - Same restructure for mobile expanded view

```typescript
// Move the Add Round button from after quizzes.map to before it
// Delete the button from lines 534-547
// Add it at line 513 (after the loading check opens)
```

---

### File: `src/components/social/GameStyleQuestionEditor.tsx`

#### Change 7: Fix Navigation Arrows Visibility

**Location: Lines 725-750** - Increase z-index and improve contrast

```typescript
// BEFORE:
<button
  className="fixed left-2 md:left-4 z-40 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm ..."
  style={{ top: 'calc(50% - 80px)' }}
>

// AFTER:
<button
  className="fixed left-3 md:left-6 top-1/2 -translate-y-1/2 z-[60] w-11 h-11 md:w-14 md:h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/30 ..."
>
```

Same changes for the right arrow.

---

## Summary Table

| Location | Change |
|----------|--------|
| Desktop modal cover (294-298) | Remove collection badge from cover image |
| Mobile card cover (428-432) | Remove collection badge from cover image |
| Desktop info row (315-319) | Change badge to orange/purple/blue gradient |
| Mobile info row (459-463) | Change badge to orange/purple/blue gradient |
| Desktop rounds list (332-367) | Move "რაუნდის დამატება" to top of list |
| Mobile rounds list (513-547) | Move "რაუნდის დამატება" to top of list |
| Question editor (725-750) | Fix arrow z-index and visibility |

---

## Expected Result

- Collection badge only appears once (in info row below cover, not on cover image)
- Badge has attractive orange-purple-blue gradient instead of solid purple
- "რაუნდის დამატება" button appears above the list of rounds for easier access
- Navigation arrows in question editor are clearly visible with higher z-index and better contrast
- AddRoundToCollectionModal still opens as full-screen modal (this is the current behavior and stays in the same flow context)
