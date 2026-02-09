

## Fix: Hide Question Text for Image Questions Across All Screens

### Problem
Image-based questions show text like "Who is this person?" or "What is this?" which is unanswerable without the image. When displayed, these questions should show ONLY the image + 4 answer options, with no question text.

Currently, `hideQuestionText={!!imageUrl}` is only set in 3 out of 7 screens that use `QuizQuestionCard`. The other 4 screens show the question text even for image questions.

### Solution
Add `hideQuestionText={!!imageUrl}` to every `QuizQuestionCard` usage across all game screens. This ensures image questions never display text -- just the image and answers.

### Files to Edit

| File | Current Status | Change |
|------|---------------|--------|
| `src/components/game/QuizGameScreenProd.tsx` | Already has `hideQuestionText` | No change needed |
| `src/components/team/MultiplayerGameScreenV2.tsx` | Already has `hideQuestionText` | No change needed |
| `src/pages/CategoryQuizPage.tsx` | Already has `hideQuestionText` | No change needed |
| `src/components/game/QuizGameScreen.tsx` | MISSING | Add `hideQuestionText` + pass `imageUrl`/`videoUrl`/`audioUrl` props |
| `src/components/team/MultiplayerGameScreen.tsx` | MISSING | Add `hideQuestionText` + media props |
| `src/components/team/MultiplayerObserverScreen.tsx` | MISSING | Add `hideQuestionText` + media props |
| `src/components/tv/TVQuestionScreenV4.tsx` | MISSING | Add `hideQuestionText` |
| `src/components/admin/studio/QuestionPreviewPanel.tsx` | MISSING | Add `hideQuestionText` |

### What Changes Per File

For each missing screen, add this prop to the `QuizQuestionCard`:
```
hideQuestionText={!!currentQuestion.imageUrl}
```
(adjusted for each file's property naming convention -- e.g. `image_url` vs `imageUrl`)

This is a small, safe change -- just adding one prop to 5 components that already render `QuizQuestionCard`.
