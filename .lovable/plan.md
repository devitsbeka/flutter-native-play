

## Handle Image Questions: Hide Text and Icon, Show "Image Question" Label

### Problem
Currently, image-based questions display both the image AND the full question text (plus the icon), which is confusing. The user wants image questions to show only the image with a simple label indicating it's an image question -- no question text, no icon.

### Changes

#### 1. Admin Preview Panel (`QuestionPreviewPanel.tsx`)
- When the question has an `image_url`, hide the `DynamicIcon` / icon area above the card
- Pass `hideQuestionText={true}` to `QuizQuestionCard` when an image is present (this prop already exists)
- The `QuizQuestionCard` already supports `imageUrl` and `hideQuestionText` props, so this is straightforward

#### 2. Demo TV Gameplay (`SampleDemoTV.tsx`)
- When a question has an `image_url`, skip rendering the `DynamicIcon` and pass `hideQuestionText={true}` plus the `imageUrl` to `QuizQuestionCard`
- Currently the demo questions don't have `image_url` fields, but the logic should be in place for when they do

#### 3. `QuizQuestionCard` Enhancement
- When `hideQuestionText` is true and the card has an image, add a small translucent label overlay or text below the image saying "სურათიანი კითხვა" (image question) so it's clear what type of question it is

### Technical Details

**`QuestionPreviewPanel.tsx`** (lines ~80-100):
- Wrap the icon rendering in a condition: only show `DynamicIcon` if `!question.image_url`
- Add `hideQuestionText={!!question.image_url}` to the `QuizQuestionCard` props

**`SampleDemoTV.tsx`** (lines ~109-122):
- Conditionally render the `DynamicIcon` block only when `!question.image_url`
- Pass `imageUrl={question.image_url}` and `hideQuestionText={!!question.image_url}` to `QuizQuestionCard`
- Set `reserveTopSpace` based on whether there's no image (only reserve space when showing icon)

**`quiz-question-card.tsx`**:
- When `hideQuestionText` is true and `hasImage` is true, render a small centered label "სურათიანი კითხვა" below the image area instead of the question text block, so users understand it's an image-based question
