
# Plan: Fix Duplicate Category Display When Adding to Queue

## Problem

When clicking "რიგში დამატება" (Add to Queue) on the results screen, the selected category (e.g., "ფსიქოლოგია") appears twice:
1. As the main title with "მიმდინარე" subtitle
2. As item #2 in the queue section

This happens because `handleAddToQueue` in `GameResultsScreenV2.tsx`:
1. Adds the item to `room_category_queue` table
2. **Also** updates `game_rooms.category_name` to the same value

## Expected Behavior

When adding to queue:
- Item should ONLY appear in the queue (not as "current")
- Queue items should be numbered starting from 1 (since there's no "current" category)
- User can keep adding more items to queue
- The "current" category is only set when game starts (first queue item becomes current)

## Root Cause

In `GameResultsScreenV2.tsx`, lines 327-335:
```typescript
await supabase
  .from("game_rooms")
  .update({
    status: "waiting",
    category_id: item.source_type === "category" ? item.category_id : null,
    category_name: item.category_name || ...,  // ← Sets same category as current!
    user_trivia_id: item.source_type === "user_trivia" ? item.user_trivia_id : null,
  })
```

This update should NOT set the category fields - it should clear them so the lobby shows "აირჩიე რაუნდი" (empty state) while the queue shows the pending items.

## Solution

### File: `src/components/team/GameResultsScreenV2.tsx`

Update `handleAddToQueue` to NOT set category fields when adding to queue:

```typescript
const handleAddToQueue = async (item: {...}) => {
  if (!currentRoom) return;
  
  // Add item to queue first
  await addToQueue(item);
  
  // Reset room status to waiting, but DON'T set category
  // The queue items will be shown separately, and the first item
  // will become "current" only when the game starts
  await supabase
    .from("game_rooms")
    .update({
      status: "waiting",
      category_id: null,      // ← Clear - no current category
      category_name: null,    // ← Clear - show empty state
      user_trivia_id: null,   // ← Clear - no current trivia
    })
    .eq("id", currentRoom.id);
  
  continueInRoom();
};
```

### File: `src/components/team/CategoryPickerSection.tsx`

Update numbering logic - when there's no current category, queue items should start from 1:

Currently:
```typescript
{hasCategory ? index + 2 : index + 1}
```

This is already correct! When `hasCategory` is false (no current selection), it shows `index + 1`.

## Updated Flow

| Step | Category Section | Queue Section |
|------|------------------|---------------|
| Initial (no selection) | "რისი თამაში გინდა?" | Empty |
| After adding "ფსიქოლოგია" to queue | "რისი თამაში გინდა?" | `[1] ფსიქოლოგია` |
| After adding "ისტორია" to queue | "რისი თამაში გინდა?" | `[1] ფსიქოლოგია → [2] ისტორია` |
| Game starts | "ფსიქოლოგია" + "მიმდინარე" | `[2] ისტორია` |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/team/GameResultsScreenV2.tsx` | Clear category fields (set to null) instead of setting them when adding to queue |

## Visual Comparison

**Before (Bug):**
```text
ფსიქოლოგია      ← Current (from game_rooms.category_name)
მიმდინარე

რიგი:
[2 ფსიქოლოგია ×]  ← Duplicate (from room_category_queue)
```

**After (Fixed):**
```text
რისი თამაში გინდა?    ← Empty state (category_name is null)
დაამატე კატეგორია

რიგი:
[1 ფსიქოლოგია ×]      ← Only in queue, numbered from 1
```
