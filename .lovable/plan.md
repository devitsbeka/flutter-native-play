

## Fix: Make Questions Fully Editable in Edit Modal

### Problem
The Embla carousel intercepts all touch/pointer events for its drag-to-swipe functionality, which prevents clicking on any interactive element inside the question cards (icon picker, question text, answers, delete button).

### Solution

**1. Disable carousel drag gestures** (`EditQuizModal.tsx`)
- Set `watchDrag: false` in carousel options since navigation arrows and dot indicators already exist for switching between questions
- This single change fixes ALL click/tap issues at once — no more `stopPropagation` hacks needed
- Remove the `onPointerDownCapture`/`onTouchStartCapture` workaround

**2. Make questions and answers editable** (`EditQuizModal.tsx`)
- When a question card's text or answer is tapped, open the existing `EditQuestionDialog` component for full editing (question text, correct answer, incorrect answers)
- Add an "Edit" button on each question card that opens `EditQuestionDialog`
- Pass the current question data to the dialog and update state on save

### Technical Details

Changes to `src/components/social/EditQuizModal.tsx`:
- Import `EditQuestionDialog` from `./EditQuestionDialog`
- Add `watchDrag: false` to carousel opts (line ~449)
- Remove `onPointerDownCapture`/`onTouchStartCapture` from the icon wrapper
- Add state for `editingQuestionIndex` (which question is being edited)
- Add a tap handler on the question card or an edit button that sets `editingQuestionIndex`
- Render `EditQuestionDialog` when `editingQuestionIndex !== null`
- On save from dialog, update the `questions` state array at the given index

