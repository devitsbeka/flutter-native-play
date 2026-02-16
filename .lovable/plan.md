

## Fix: Remove Text Question from Image Questions on TV Screen

### Problem

On the TV question screen (`TVQuestionScreenV4.tsx`), image-based questions show both the textual question AND the image in a 50/50 split layout. The text card above the image takes space and causes the image to be cropped. Since image questions are self-explanatory, the text should be hidden entirely.

### Change

**File: `src/components/tv/TVQuestionScreenV4.tsx` (lines 232-251)**

Remove the question text card from the image question layout, and let the image take the full left-side space:

Current layout (left 50%):
```
[Question text card]  <-- REMOVE THIS
[Image (cropped)]
```

New layout (left 50%):
```
[Image (full height, no cropping)]
```

Specifically:
- Delete the question text `<div>` block (lines 234-239) that renders `currentQuestion.question_text`
- The image container already has `flex-1 min-h-0` so it will naturally expand to fill the freed space

This is a 6-line deletion with no other changes needed.

