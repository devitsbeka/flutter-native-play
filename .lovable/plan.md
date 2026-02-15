
## Fix Image Question Layout to Fit Viewport Without Scrolling

### Problem
Image-based questions waste vertical space in two ways:
1. The image container is too tall (`h-52` = 208px)
2. A redundant label "სურათიანი კითხვა" takes up extra space below the image

This causes the 4th answer button to be pushed below the viewport, requiring scrolling.

### Changes

#### 1. Remove "სურათიანი კითხვა" label (`quiz-question-card.tsx`)
- Delete the entire "Image question label" block that shows when `hideQuestionText && hasImage`
- This removes unnecessary vertical space

#### 2. Reduce image height (`quiz-question-card.tsx`)
- Change image container from `h-52` (208px) to `h-36` (144px)
- This gives enough space to show the image clearly while leaving room for all 4 answers
- Also reduce video container from `h-44` to `h-36` for consistency

#### 3. Reduce padding when image is shown (`quiz-question-card.tsx`)
- When `hideQuestionText` is true and there's an image, minimize bottom padding since there's no text below the image — just go straight to progress bar

### Technical Details

**File: `src/components/ui/quiz-question-card.tsx`**

- Lines 219-225: Remove the "სურათიანი კითხვა" label block entirely
- Line 104: Change `h-52` to `h-36` for image container
- Line 118: Change `h-44` to `h-36` for video container

These changes apply globally across all game modes (single player, multiplayer, TV) since they all use the same `QuizQuestionCard` component with `hideQuestionText={!!imageUrl}`.
