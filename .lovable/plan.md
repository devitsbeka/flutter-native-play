

## Make Preview Icon Clickable to Change Question Icon

### Overview
Make the icon in the phone mockup preview clickable so you can quickly change a question's icon without opening the full edit form. Clicking the icon will open a popover with the existing `IconPicker` component, and selecting a new icon will save it directly to the database.

### Changes

**File: `src/pages/admin/ContentManager.tsx`**

1. **Add state for icon picker popover**: Add a `showPreviewIconPicker` boolean state.

2. **Add `isEditable` and `onIconClick` props** to the `QuestionMockupPreview` component (line ~690):
   - `isEditable={true}`
   - `onIconClick={() => setShowPreviewIconPicker(true)}`

3. **Add a Popover with `IconPicker`** below the `QuestionMockupPreview` component:
   - Wrap the preview in a `Popover` from Radix UI
   - The popover content will contain the existing `IconPicker` component
   - When an icon is selected, call `updateQuestion(selectedQuestion.id, { icon_slug: slug })` to save directly to the database
   - Close the popover after selection

### How It Works
- The `QuestionMockupPreview` component already has built-in support for `isEditable` and `onIconClick` -- it shows a pencil overlay on hover
- Clicking the icon opens a popover with the full icon search/picker
- Selecting an icon saves it immediately and updates the preview

### No New Files
All changes are in `ContentManager.tsx` only, reusing existing `IconPicker` and `Popover` components.
