
# Plan: Add Dark Blur Overlay for Expanded Collections on Desktop/Tablet

## Overview

When a user clicks on a collection card to view/edit its rounds on desktop or tablet, the background will become darker and blurred to highlight the focused collection.

## Technical Approach

### Solution: Lift Expanded State + Conditional Overlay

1. **Track Expanded Collection ID in Parent** - Add state in `MyTriviaTab` to track which collection is currently expanded
2. **Add Dark Blur Overlay** - Render a fixed overlay when any collection is expanded (only on md+ screens)
3. **Elevate Expanded Card** - Give the expanded collection a higher z-index to appear above the overlay

---

## Technical Changes

### File: `src/components/social/MyTriviaTab.tsx`

**1. Add imports and state for expanded tracking**

At the top of `MyTriviaTab` function (around line 692):
```typescript
import { useIsMobile } from "@/hooks/use-mobile";
```

Add new state:
```typescript
const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
const isMobile = useIsMobile();
```

**2. Update CollectionCard to accept callback**

Update `CollectionCard` props (around line 185):
```typescript
function CollectionCard({ 
  collection, 
  profile, 
  onEditCollection, 
  onEditRound, 
  onAddRound, 
  onPlay, 
  onPost, 
  isNew, 
  isPosting,
  onExpandChange,  // NEW: callback when expanded state changes
  isExpanded: isExpandedProp  // NEW: controlled expanded state
}: { 
  // ... existing props
  onExpandChange?: (collectionId: string | null) => void;
  isExpanded?: boolean;
}) {
```

**3. Update CollectionCard expand logic**

Change the internal state to use controlled pattern:
```typescript
// In CollectionCard
const isExpanded = isExpandedProp ?? false;

const handleToggleExpand = () => {
  const newExpandedState = !isExpanded;
  onExpandChange?.(newExpandedState ? collection.id : null);
};
```

Update the button onClick:
```typescript
<button
  onClick={handleToggleExpand}
  className="w-full text-left"
>
```

**4. Add z-index for expanded card**

Update the CollectionCard wrapper motion.div (around line 202):
```typescript
<motion.div
  // ... existing props
  className={cn(
    "bg-card rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-lg",
    isExpanded && "relative z-50"  // Elevate when expanded
  )}
>
```

**5. Add overlay in MyTriviaTab render**

Before the grid (around line 1017), add the overlay:
```typescript
{/* Dark blur overlay when collection is expanded (md+ only) */}
{expandedCollectionId && !isMobile && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
    onClick={() => setExpandedCollectionId(null)}
  />
)}
```

**6. Update CollectionCard usage in grid**

Update the CollectionCard rendering (around line 1021):
```typescript
<CollectionCard 
  key={item.data.id} 
  collection={item.data} 
  profile={profile} 
  onEditCollection={(data) => setEditingQuiz(data)}
  onEditRound={(quiz) => setEditingRound(quiz)}
  onAddRound={(collectionId, roundNumber) => 
    setAddingToCollection({ collectionId, roundNumber })
  }
  onPlay={onPlay}
  onPost={handleToggleCollectionVisibility}
  isNew={newItemIds.has(item.data.id)}
  isPosting={postingItemId === item.data.id}
  isExpanded={expandedCollectionId === item.data.id}  // NEW
  onExpandChange={setExpandedCollectionId}            // NEW
/>
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line 1 | Add `useIsMobile` import |
| Line ~693 | Add `expandedCollectionId` state and `isMobile` hook |
| Line 185 | Add `onExpandChange` and `isExpanded` props to CollectionCard |
| Line 186-187 | Convert to controlled expand state pattern |
| Line 202 | Add conditional z-50 class when expanded |
| Line ~1017 | Add dark blur overlay with AnimatePresence |
| Line ~1021 | Pass isExpanded and onExpandChange to CollectionCard |

---

## Expected Result

### On Desktop/Tablet (md+ screens):
- Clicking a collection card to expand it will:
  - Dim the entire background with a dark semi-transparent overlay
  - Add a subtle blur effect to the background
  - Highlight the expanded collection card above the overlay
- Clicking the overlay will close the expanded collection
- Clicking the same collection's expand button will also close it

### On Mobile:
- No overlay effect (same behavior as before)
- Collections expand/collapse normally within the flow

---

## Visual Effect

```text
Before (collapsed):
+------------------+  +------------------+
|   Collection A   |  |   Collection B   |
+------------------+  +------------------+
+------------------+  +------------------+
|   Collection C   |  |   Collection D   |
+------------------+  +------------------+

After (Collection A expanded on desktop):
+------------------+  +------------------+
|   Collection A   |  | [DIMMED+BLURRED] |
|   [Rounds...]    |  |   Collection B   |
|   + Add Round    |  +------------------+
+------------------+  +------------------+
                      | [DIMMED+BLURRED] |
                      |   Collection D   |
                      +------------------+
```
