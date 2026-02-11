

## Fix: Question Edits Still Not Saving (Stacking Context Bug)

### Root Cause

The `EditQuestionDialog` component's root container has `z-50` (line 80 of EditQuestionDialog.tsx). Inside `EditQuizModal.tsx`, it renders **before** the main save footer (line 616 vs line 656), which also has `z-50`.

When two sibling elements share the same z-index, DOM order wins -- the later element (main footer) renders on top. The `z-[60]` on the dialog's footer is **trapped** inside its parent's `z-50` stacking context and can never exceed the main footer's `z-50`.

This is why:
- Icons work (they use a portal rendered at `document.body`, escaping the stacking context)
- Question text and answers never save (the dialog's save button is covered by the main footer)

### Fix

**File: `src/components/social/EditQuestionDialog.tsx`, line 80**

Change the dialog's root container z-index from `z-50` to `z-[200]`:

```
Before: className="fixed inset-0 z-50 bg-[#7E7ADB]"
After:  className="fixed inset-0 z-[200] bg-[#7E7ADB]"
```

This lifts the entire dialog (including its header and footer) above the main modal's footer (`z-50`), ensuring the save button is clickable.

### Why This Works

| Element | Current z-index | Fixed z-index |
|---------|----------------|---------------|
| EditQuizModal container | z-[100] | z-[100] (unchanged) |
| Main save footer | z-50 (within z-[100]) | z-50 (unchanged) |
| EditQuestionDialog root | z-50 | z-[200] |
| EditQuestionDialog footer | z-[60] (trapped in z-50) | z-[60] (now inside z-[200], so effective) |

One line change, single file.

