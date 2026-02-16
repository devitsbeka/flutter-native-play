

## Multi-Select Category Picker with Icons

### What Changes

**File: `src/components/controller/ControllerPollScreen.tsx`**

Currently, clicking "ბიბლიოთეკიდან" opens a category list where tapping any category immediately submits it as a suggestion and closes the picker. To add more, the user must go back and tap "ბიბლიოთეკიდან" again. This is tedious.

### New Behavior

1. **Multi-select mode**: Tapping a category toggles it (selected/unselected) with a visual checkmark indicator instead of immediately submitting
2. **Selected count badge**: Show how many categories are selected at the top (e.g., "არჩეულია: 3")
3. **"ხმის მიცემის დაწყება" button**: A sticky bottom button that submits ALL selected categories at once. The button shows the count (e.g., "დამატება (3)"). Disabled when nothing is selected.
4. **Already-suggested categories**: Categories that are already in the suggestions list are shown as disabled/greyed out so the user can't double-add them
5. **Category icons**: Already present in the list via `QuizCategoryIcon` -- no changes needed here, icons are already showing

### Technical Details

**State changes in `ControllerPollScreen.tsx`:**
- Add `selectedCategoryIds: Set<string>` state to track multi-selection
- Replace `handleSelectCategory(category)` single-submit with a toggle function that adds/removes from the set
- Add new `handleSubmitSelectedCategories()` that loops through selected IDs, calls `submitSuggestion()` for each, then closes the picker
- Filter out already-suggested category IDs (from `mySuggestions`) to show them as disabled

**UI changes in the category picker section (lines 338-372):**
- Each category row gets a checkbox/checkmark indicator on the right side instead of `ChevronRight`
- Selected rows get highlighted border (e.g., `border-green-400 bg-green-500/20`)
- Bottom sticky bar with submit button replacing the close-on-tap behavior
- The X close button at top remains for cancelling without adding

**Same changes apply to `ControllerDirectSelection.tsx`** which has an identical category picker pattern (lines 222-267). Both files will get the multi-select treatment.
