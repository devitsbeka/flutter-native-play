

# Plan: Add "Mixed Questions" Feature

## Overview

Add a new "სხვადასხვა კატეგორიები" (Mixed Questions) option that appears **first in the Library view** within the category picker. When selected, this option mixes questions from **all categories** together, creating a surprise experience where each question could be from any category.

---

## Technical Approach

### How It Differs From Current "შემთხვევითი" (Random)

| Feature | შემთხვევითი (Random) | სხვადასხვა (Mixed) |
|---------|---------------------|-------------------|
| What it does | Picks a random **single category** for the game | Mixes questions from **all categories** together |
| User experience | All 5 questions are from one unknown category | Each question could be from a different category |
| Location | Main menu (top level) | Inside Library view (first item) |

The current "Random" feature selects ONE random category at game start. The new "Mixed" feature will use the **existing `getMultiCategoryVSQuestions`** function which already fetches one question per category from all available categories.

---

## Implementation Strategy

### 1. Define Mixed Category Constant

Create a special "virtual category" identifier that triggers multi-category mode:

```typescript
// Special identifier - not a real database category
const MIXED_CATEGORY_ID = '__mixed__';
const MIXED_CATEGORY_NAME = 'სხვადასხვა კატეგორიები';
const MIXED_CATEGORY_ICON_SLUG = 'mystery-box';
```

### 2. Update CategoryPickerModal (Library View)

Add the "Mixed" option as the **first item** in the Library grid, before fetched categories:

```
┌─────────────────────────────────────────┐
│  🔍 Search...                           │
├─────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐        │
│ │  🎁 Mixed   │  │  📚 History │  ...   │
│ │ სხვადასხვა   │  │ ისტორია     │        │
│ └─────────────┘  └─────────────┘        │
│                                         │
│ ... other categories ...                │
└─────────────────────────────────────────┘
```

### 3. Handle Mixed Selection in Game Start Logic

When `category_id === '__mixed__'`:
- Call `getQuestions({ mode: 'vs', categorySlug: undefined, count: 5 })`
- This already triggers `getMultiCategoryVSQuestions()` which fetches from all categories

### 4. Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/CategoryPickerModal.tsx` | Add Mixed option as first item in Library grid |
| `src/components/team/CategorySelectorModal.tsx` | Add Mixed option as first item (used in other flows) |
| `src/contexts/MultiplayerContextV2.tsx` | Handle `__mixed__` category_id in startGame/startNextFromQueue |
| `src/components/team/RoomLobbyV2.tsx` | Display "Mixed" properly in lobby UI |
| `src/components/team/GameResultsScreenV2.tsx` | Handle Mixed display in queue items |

---

## Detailed Changes

### File 1: `src/components/team/CategoryPickerModal.tsx`

**Location: Library view grid (around line 323)**

Insert a "Mixed Questions" card as the first item before mapping categories:

```tsx
{/* Mixed Questions - always first */}
<motion.button
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  onClick={() => setSelectedItem({
    type: "category",
    id: "__mixed__",
    name: "სხვადასხვა კატეგორიები",
    iconSlug: "mystery-box",
  })}
  className={`p-4 rounded-xl backdrop-blur-sm transition-all text-left ${
    selectedItem?.id === "__mixed__"
      ? "bg-white/20 border-2 border-white/50"
      : "bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/30 hover:from-purple-500/40 hover:to-pink-500/40"
  }`}
>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
      <DynamicIcon slug="mystery-box" size={22} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-white text-sm truncate">სხვადასხვა კატეგორიები</p>
      <p className="text-white/50 text-xs">ყველა კატეგორიიდან</p>
    </div>
    {selectedItem?.id === "__mixed__" && (
      <Check className="w-4 h-4 text-white flex-shrink-0" />
    )}
  </div>
</motion.button>
```

### File 2: `src/contexts/MultiplayerContextV2.tsx`

**Location: startNextFromQueue (around line 1947)**

Update the logic that fetches questions to handle `__mixed__`:

```typescript
// Line 1947 - Handle __mixed__ as categorySlug undefined
const newCategoryId = nextItem.source_type === "random" 
  ? null 
  : nextItem.category_id === "__mixed__" 
    ? undefined  // This triggers getMultiCategoryVSQuestions
    : nextItem.category_id;
    
const newCategoryName = nextItem.source_type === "random" 
  ? "შემთხვევითი" 
  : nextItem.category_id === "__mixed__"
    ? "სხვადასხვა კატეგორიები"
    : (nextItem.category_name || "კატეგორია");
```

**Location: startGame (around line 1130-1160)**

Similarly update to handle `__mixed__` category:

```typescript
// Check if this is the mixed category
const isMixedCategory = freshRoom.category_id === "__mixed__";

// Fetch questions - undefined categorySlug triggers multi-category mode
const result = await getQuestions({
  mode: 'vs',
  categorySlug: isMixedCategory ? undefined : resolvedCategorySlug,
  count: questionCount,
  excludeIds: usedIds,
});
```

### File 3: `src/components/team/CategorySelectorModal.tsx`

Add the same Mixed option as first item in the grid (similar to CategoryPickerModal changes).

### File 4: Queue Display Updates

In `RoomLobbyV2.tsx` and `GameResultsScreenV2.tsx`, add logic to display a special icon for Mixed:

```tsx
{item.category_id === "__mixed__" ? (
  <DynamicIcon slug="mystery-box" size={20} />
) : item.source_type === "random" ? (
  <Shuffle className="w-5 h-5 text-purple-300" />
) : (
  <DynamicIcon slug={item.icon_slug} categoryId={item.category_id} size={20} />
)}
```

---

## Visual Design

The Mixed category card will have:
- **Rainbow/gradient background**: `from-purple-500/30 to-pink-500/30`
- **Icon**: `mystery-box` from the 9k icon library (rendered via DynamicIcon)
- **Title**: "სხვადასხვა კატეგორიები" 
- **Subtitle**: "ყველა კატეგორიიდან" (From all categories)

---

## Flow Diagram

```text
User opens Category Picker
         ↓
     Main Menu
   ┌──────────────┐
   │ შემთხვევითი   │ → Picks random single category
   │ ბიბლიოთეკა   │ → Opens Library view
   │ ჩემი ტრივიები │
   └──────────────┘
         ↓
   User clicks "ბიბლიოთეკა"
         ↓
    Library View
   ┌──────────────────────────┐
   │ 🎁 სხვადასხვა (FIRST)    │ → NEW: Mixed from all
   │ 📚 საქართველოს ისტორია  │
   │ 🌍 მსოფლიო ისტორია      │
   │ ...other categories...   │
   └──────────────────────────┘
         ↓
   User selects Mixed
         ↓
   category_id = "__mixed__"
         ↓
   startGame() detects __mixed__
         ↓
   Calls getQuestions({ categorySlug: undefined })
         ↓
   getMultiCategoryVSQuestions() fetches
   one question from each random category
         ↓
   Game plays with diverse questions!
```

---

## Edge Cases Handled

1. **Search filter**: Mixed option will appear only when search is empty (or always if matches "სხვადასხვა")
2. **Queue display**: Special handling for `__mixed__` category_id to show correct icon/name
3. **Room state**: `category_name` stored as "სხვადასხვა კატეგორიები" for display
4. **Question icons**: Each question shows its own category's icon (already handled by icon_slug)

---

## Files Summary

| File | Type of Change |
|------|----------------|
| `src/components/team/CategoryPickerModal.tsx` | Add Mixed card to Library grid |
| `src/components/team/CategorySelectorModal.tsx` | Add Mixed card to selector grid |
| `src/contexts/MultiplayerContextV2.tsx` | Handle `__mixed__` in startGame & startNextFromQueue |
| `src/components/team/RoomLobbyV2.tsx` | Display Mixed icon in category picker section |
| `src/components/team/GameResultsScreenV2.tsx` | Display Mixed icon in queue items |
| `src/components/challenge/LibraryCategoryPicker.tsx` | Add Mixed option (if used elsewhere) |

