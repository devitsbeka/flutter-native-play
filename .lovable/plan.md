

## Fix: Question Edits Never Persist

### Root Cause
There is a **z-index stacking bug** between two fixed-position footers:

1. **EditQuestionDialog footer** (save button for the question edit) -- has **no z-index**
2. **EditQuizModal main footer** (save button that writes to DB) -- has **z-50**

Both are `position: fixed; bottom: 0`. Because the main footer has `z-50` and the dialog footer has no z-index, the main save button sits **on top of** the dialog's save button. When the user taps "Save" while editing a question, they are unknowingly hitting the main save button, which writes the **unchanged** questions array to the database.

This is why icons work (they use a separate portal-based picker) but question text and answers never change.

### Fix (single file change)

**File: `src/components/social/EditQuestionDialog.tsx`**

Add `z-[60]` to the EditQuestionDialog's fixed footer div (line ~161), so it sits above the main modal's `z-50` footer:

```
Before: className="fixed bottom-0 left-0 right-0 p-5 border-t ..."
After:  className="fixed bottom-0 left-0 right-0 z-[60] p-5 border-t ..."
```

This ensures that when the EditQuestionDialog is open, its save button is clickable and triggers the `onSave` callback that updates the questions array in local state. The main save button (which persists to the database) remains usable after the dialog closes.

### Summary

| What | Status |
|------|--------|
| Root cause | Main save button (z-50) covers EditQuestionDialog save button (no z-index) |
| Fix | Add z-[60] to EditQuestionDialog footer |
| Files changed | 1 (`EditQuestionDialog.tsx`) |
| Risk | None -- only affects stacking when the edit dialog is open |
