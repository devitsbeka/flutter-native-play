

# Plan: Improve Collection Card UX with Centering and Play Button

## Issues to Fix

1. **Round cards not clickable**: The `CollectionQuizCard` (round container with image and title) should be clickable to play
2. **Expanded collection not centered**: When clicked, the collection should stick to the center of the viewport
3. **Add play button**: Add a visible play button with "ითამაშე" text to the expanded collection
4. **Scroll issue**: The expanded card is stuck and doesn't scroll properly (needs fixed positioning with scrollable content)

---

## Technical Changes

### File: `src/components/social/MyTriviaTab.tsx`

#### 1. Make CollectionQuizCard Clickable (Lines 103-176)

The entire round card should be clickable to play:

```typescript
// Line 103-104: Add onClick to container
return (
  <div 
    className="flex gap-3 p-4 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors"
    onClick={() => onPlay?.(quiz)}
  >
```

Keep the edit button stopPropagation as-is at lines 126-135.

#### 2. Transform Expanded Collection into Fixed Centered Modal (Lines 232-418)

When expanded on desktop/tablet, convert the collection card to a fixed centered modal:

**Current structure:**
```typescript
<motion.div className={cn("bg-card rounded-2xl...", isExpanded && "relative z-50")}>
  {/* Header button */}
  <button onClick={handleToggleExpand}>...</button>
  
  {/* Expanded content */}
  <AnimatePresence>{isExpanded && ...}</AnimatePresence>
</motion.div>
```

**New structure (controlled by `isExpanded` and `!isMobile`):**
```typescript
// When expanded on desktop, render as fixed centered modal
{isExpanded && !isMobile ? (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
  >
    <motion.div 
      className="bg-card rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-2xl 
                 w-full max-w-lg max-h-[85vh] flex flex-col"
    >
      {/* Scrollable content container */}
      <div className="flex-1 overflow-y-auto">
        {/* Header with image/gradient - reduced height */}
        <div className="h-40 relative overflow-hidden">
          {/* Same gradient/image content */}
          {/* Close button in top-right */}
        </div>
        
        {/* Collection info */}
        {/* Rounds list */}
        {/* Add round button */}
      </div>
      
      {/* Fixed Play Button at bottom */}
      <div className="p-4 border-t border-border bg-card">
        <ChunkyButton 
          variant="primary" 
          size="lg" 
          className="w-full gap-2"
          onClick={handlePlayCollection}
        >
          <Play className="w-5 h-5 fill-current" />
          ითამაშე
        </ChunkyButton>
      </div>
    </motion.div>
  </motion.div>
) : (
  // Normal in-grid card (mobile or collapsed)
  <motion.div className="bg-card rounded-2xl border-2 border-purple-500/30...">
    ...existing structure...
  </motion.div>
)}
```

#### 3. Add Play Handler for Collection

Add a function to play all rounds in the collection:

```typescript
const handlePlayCollection = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (quizzes && quizzes.length > 0) {
    const allPosts = quizzes.map(q => convertQuizToSamplePost(q, profile));
    onPlay?.(allPosts[0], allPosts);
  }
};
```

#### 4. Add isMobile prop to CollectionCard

Pass `isMobile` from parent to control behavior:

**Props update (Line 198-210):**
```typescript
isExpanded?: boolean;
onExpandChange?: (collectionId: string | null) => void;
isMobile?: boolean;  // NEW
```

**Usage (Line 1070-1085):**
```typescript
<CollectionCard 
  ...
  isMobile={isMobile}
/>
```

#### 5. Update Overlay to Stay Behind Modal (Lines 1053-1064)

The overlay is already at `z-40`, modal at `z-50` - this is correct.

---

## Component Structure When Expanded on Desktop

```text
+------------------------------------------+
|              [Dark Overlay z-40]         |
|   +----------------------------------+   |
|   |        [Modal z-50]              |   |
|   |   +--------------------------+   |   |
|   |   |    Cover Image/Gradient  |   |   |
|   |   |    Title, Close Button   |   |   |
|   |   +--------------------------+   |   |
|   |   |    Scrollable Content    |   |   |
|   |   |    - Round 1 (clickable) |   |   |
|   |   |    - Round 2 (clickable) |   |   |
|   |   |    - Round 3 (clickable) |   |   |
|   |   |    - [+ Add Round]       |   |   |
|   |   +--------------------------+   |   |
|   |   | [Play Icon] ითამაშე      |   |   |
|   |   +--------------------------+   |   |
|   +----------------------------------+   |
+------------------------------------------+
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line 103-104 | Add onClick to CollectionQuizCard container |
| Line 198-210 | Add `isMobile` prop to CollectionCard |
| Line 212 | Add `isMobile` destructuring |
| Line 215-220 | Add `handlePlayCollection` function |
| Line 232-418 | Wrap in conditional: fixed modal (desktop) vs inline card (mobile) |
| Line 370-415 | Move rounds into scrollable container with fixed play button |
| Line 1070-1085 | Pass `isMobile` prop to CollectionCard |

---

## Expected Result

- **Clicking collection header**: Opens centered modal with dark backdrop on desktop/tablet
- **Clicking round card**: Navigates to play that specific round
- **Play button**: Prominent purple "ითამაშე" button at modal bottom plays all rounds
- **Scroll behavior**: Modal content scrolls independently, card stays centered
- **Mobile**: Keeps current inline expand behavior (no changes)
- **Clicking overlay or close button**: Closes the modal

