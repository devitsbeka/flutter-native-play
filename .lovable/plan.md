

## Show Icons on All Question Previews

### Problem
Questions without a personal `icon_slug` show "?" in the phone mockup preview. The user wants every question to display an icon.

### Solution
When a question has no `icon_slug`, fall back to the category's default icon using the existing `CATEGORY_ID_TO_ICON` mapping from `src/data/categoryIconMap.ts`.

### Changes

**File: `src/pages/admin/ContentManager.tsx`**

1. Add import for `CATEGORY_ID_TO_ICON` from `@/data/categoryIconMap`.
2. Update the `iconSlug` prop on `QuestionMockupPreview` (line 694) to:
   ```
   iconSlug={selectedQuestion.icon_slug || CATEGORY_ID_TO_ICON[selectedCategory?.category_id || ''] || undefined}
   ```

This way:
- If the question has its own `icon_slug` -- use it
- Otherwise, use the category's mapped icon (e.g., "microscope" for science, "globe" for geography)
- Only show "?" if neither exists (which shouldn't happen given the 45 mapped categories)

One file, one line change, no database modifications.
