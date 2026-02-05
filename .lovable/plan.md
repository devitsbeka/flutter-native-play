
# Plan: Fix Queue Scroll vs Drag Conflict

## Problem

In the room lobby queue section, users cannot scroll horizontally through the queued items because touching anywhere on a queue pill initiates a drag-to-reorder action. The user wants to be able to:
- **Scroll** when swiping left/right on the queue items
- **Drag** to reorder only when touching the grip handle (⋮⋮ icon)

## Current Implementation Issues

In `CategoryPickerSection.tsx` (lines 116-169):

| Issue | Current Code | Problem |
|-------|--------------|---------|
| No `useDragControls` hook | Missing | Can't control which element triggers drag |
| No `dragListener={false}` | `<Reorder.Item>` captures all touches | Entire item triggers drag |
| `touch-none` class on item | Line 128: `touch-none` | Prevents any scrolling |
| Grip handle is decorative | `<GripVertical>` has no event handler | Not functional |

## Solution

Apply the same pattern used in `GameStylePersonalTrivia.tsx` (lines 92-212):

1. Import `useDragControls` from framer-motion
2. Create individual drag controls for each queue item
3. Disable automatic drag listener on `Reorder.Item`
4. Add `onPointerDown` handler to the grip icon to start drag
5. Remove `touch-none` from the item (keep it only on grip handle)
6. Allow container to handle horizontal scroll

## Technical Changes

### File: `src/components/team/CategoryPickerSection.tsx`

**Line 1** - Update import:
```tsx
import { motion, Reorder, useDragControls } from "framer-motion";
```

**Lines 116-169** - Refactor the Reorder.Group section:

Instead of inline items, create a new component `DraggableQueueItem` that uses `useDragControls`:

```tsx
function DraggableQueueItem({
  item,
  index,
  hasCategory,
  onRemoveQueueItem,
}: {
  item: QueueItem;
  index: number;
  hasCategory: boolean;
  onRemoveQueueItem?: (id: string) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={item.id}
      value={item}
      dragListener={false}  // <-- CRITICAL: Disable auto-drag
      dragControls={dragControls}
      layout
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 border border-white/20 shrink-0 h-9"
      whileDrag={{ scale: 1.1, zIndex: 50, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}
    >
      <span className="text-white/40 text-xs font-bold mr-0.5">
        {hasCategory ? index + 2 : index + 1}
      </span>
      
      {/* Drag handle - ONLY this triggers drag */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-[18px] h-[18px] text-white/40" />
      </div>
      
      {/* Icon and label - scrollable, not draggable */}
      {/* ... icon logic ... */}
      <span className="text-white/80 text-xs font-medium">
        {item.category_name || "ტრივია"}
      </span>
      
      {/* Remove button */}
      {onRemoveQueueItem && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveQueueItem(item.id);
          }}
          className="ml-0.5 p-1 rounded-full hover:bg-white/20"
        >
          <X className="w-[18px] h-[18px] text-white/50" />
        </button>
      )}
    </Reorder.Item>
  );
}
```

**Update the container div** (line 114):
```tsx
// Remove select-none and cursor-grab from items
// Remove touch-none from the Reorder.Item (move it only to grip handle)
<div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
```

**Update `Reorder.Group`** (line 116-121):
```tsx
<Reorder.Group 
  axis="x" 
  values={queue} 
  onReorder={onReorderQueue}
  className="flex gap-2"
  // Remove touchAction: "pan-y" - let natural scroll work
>
```

## Summary of Changes

| Component | Change | Effect |
|-----------|--------|--------|
| Import | Add `useDragControls` | Enable controlled dragging |
| `Reorder.Item` | Add `dragListener={false}` | Disable whole-item drag |
| `Reorder.Item` | Add `dragControls={dragControls}` | Link to controls |
| `Reorder.Item` | Remove `touch-none` class | Allow scroll on item |
| `Reorder.Item` | Remove `cursor-grab` class | Only grip shows grab cursor |
| `GripVertical` wrapper | Add `onPointerDown` handler | Grip starts drag |
| `GripVertical` wrapper | Add `touch-none` class | Prevent scroll on grip |

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/components/team/CategoryPickerSection.tsx` | 1 | Update import |
| `src/components/team/CategoryPickerSection.tsx` | 114-169 | Refactor queue items with proper drag controls |

## Result

- **Scroll**: Swiping anywhere except the grip handle scrolls through queue
- **Drag**: Only touching/clicking the grip icon (⋮⋮) initiates reorder
- **Consistent UX**: Matches behavior of answer reordering in trivia editor
