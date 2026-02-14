

## Fix Content Manager: Sticky Preview + Show Icons

### Problem
1. The phone mockup preview in Column 3 doesn't show the question's icon -- it always shows "?" because `iconSlug` is never passed to `QuestionMockupPreview`.
2. The entire right column scrolls with the page content, so when you scroll through questions in Column 2 and click one, the preview scrolls out of view.

### Changes

**File: `src/pages/admin/ContentManager.tsx`**

1. **Pass `iconSlug` to `QuestionMockupPreview`** (around line 689-694):
   - Add `iconSlug={selectedQuestion.icon_slug || undefined}` to the `QuestionMockupPreview` component so the icon renders in the phone mockup instead of "?".

2. **Make Column 3 sticky with internal scroll** (line 609):
   - Change the Column 3 wrapper from `flex-1 flex flex-col bg-muted/20` to `flex-1 flex flex-col bg-muted/20 sticky top-0 h-screen overflow-hidden`.
   - The question content area (line 658, `flex-1 p-6 overflow-auto`) already has `overflow-auto` so internal scrolling will work once the parent is height-constrained.

### Summary
| Change | Detail |
|--------|--------|
| `ContentManager.tsx` line ~689 | Pass `iconSlug` prop to phone preview |
| `ContentManager.tsx` line ~609 | Make Column 3 sticky with `h-screen` and `overflow-hidden` |

Two small edits, no new files, no database changes.

