
# Plan: Fix Category Queue Display Logic

## Problem

When picking "Geography", the UI shows it three times:
1. As the main title with "მიმდინარე კატეგორია" subtitle
2. As pill #1 in the queue row (from the `hasCategory` check creating a "current" pill)
3. As pill #2 in the queue row (from the `queue` array also containing the same category)

## Expected Behavior

The user wants:
- **Selected category**: Show as main title with "მიმდინარე" subtitle below
- **Queue section**: Only show when there are ADDITIONAL rounds queued beyond the current one
- Numbering should start from 2 for queued items (since current = 1)

## Root Cause

`CategoryPickerSection` displays:
1. Main title from `categoryName` prop
2. A "current" pill with #1 when `hasCategory` is true (lines 113-127)
3. Queue pills starting from #2 from the `queue` array (lines 138-207)

This creates redundancy when the queue also contains the current category.

## Solution

Redesign the `CategoryPickerSection` component to follow the user's desired layout:

### Changes to `CategoryPickerSection.tsx`

**1. Remove the "current" pill from the queue row**

The main title already shows the current selection prominently - no need to repeat it as pill #1 in the queue.

**2. Only show queue section when `queue.length > 0`**

Remove the condition `showQueuePreview = hasCategory || queue.length > 0` and replace with just `queue.length > 0`.

**3. Update numbering for queue items**

Queue items should be numbered starting from 2 (since current = 1 implied by main title).

**4. Update subtitle text**

- When category is selected: Show "მიმდინარე" (Current) instead of "მიმდინარე კატეგორია"
- Keep fallback text for empty state

### Updated Layout

```text
┌─────────────────────────────────────┐
│ [Icon]  გეოგრაფია              [+]  │ ← Main title (18px)
│         მიმდინარე                   │ ← Subtitle (14px)
├─────────────────────────────────────┤
│ რიგი:                               │ ← Only show if queue.length > 0
│ [2 🎲 შემთხვევითი ×] [3 📚 ისტორია ×] │ ← Queue items start at #2
└─────────────────────────────────────┘
```

### Code Changes

```typescript
// CategoryPickerSection.tsx

// 1. Simplify showQueuePreview condition
const showQueuePreview = queue.length > 0;

// 2. Remove the "current" pill section (lines 113-127)
// The main title area already shows the current selection

// 3. Update queue item numbering
// Change: index + 2 → index + 2 (keep as is, since we removed the #1 pill)
// Actually: With the current pill removed, queue items should show as 2, 3, 4...
// The "1" is implied by the main title

// 4. Update subtitle
<p className={cn("leading-snug", hasCategory ? "text-white/60 text-[14px]" : "text-white/60 text-[12px]")}>
  {isAlreadyPlayed && hasCategory
    ? "აირჩიე ახალი კატეგორია"
    : hasCategory 
      ? "მიმდინარე"  // Changed from "მიმდინარე კატეგორია"
      : "დაამატე კატეგორია სათამაშოდ"}
</p>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/CategoryPickerSection.tsx` | Remove "current" pill from queue row, only show queue when items exist, update subtitle text, update numbering logic |

## Visual Comparison

**Before (Bug):**
```text
გეოგრაფია
მიმდინარე კატეგორია

რიგი:
[1 📚 გეოგრაფია] [2 🎲 გეოგრაფია ×]  ← Same category shown 3 times!
```

**After (Fixed):**
```text
გეოგრაფია
მიმდინარე

რიგი:  ← Only shown if additional items queued
[2 🎲 შემთხვევითი ×] [3 📚 ისტორია ×]  ← Only shows queue items, starts at #2
```

## Technical Details

The numbering scheme:
- Position 1 = Current selection (shown in main title, not as pill)
- Position 2+ = Queued items (shown as pills with numbers 2, 3, 4...)

When queue is empty, the "რიგი:" section and all pills are hidden - only the main title with "მიმდინარე" subtitle is shown.
