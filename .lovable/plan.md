
# Add Question Button to My Trivia Party Edit Screen

## Overview

When editing a saved My Trivia Party (or any trivia in the `EditRoundModal`), users should be able to add new questions via a "+" button in the top right corner of the questions view.

---

## Current State

The `EditRoundModal` component handles editing saved trivias:
- Shows "კითხვა X / Y" header in questions view mode
- Has an empty spacer div on the right side of the header: `<div className="w-10" />`
- Has functions for updating and deleting questions, but **no function to add new questions**

---

## Changes Required

### File: `src/components/social/EditRoundModal.tsx`

#### 1. Add `addQuestion` Function (after `deleteQuestion` ~line 197)

Create a new function to add a blank question:

```typescript
const addQuestion = useCallback(() => {
  const newQuestion: Question = {
    question_text: "",
    correct_answer: "",
    incorrect_answers: ["", "", ""],
    icon_slug: undefined,
  };
  const newQuestions = [...questions, newQuestion];
  setQuestions(newQuestions);
  
  // Navigate to the new question after a short delay
  setTimeout(() => {
    carouselApi?.scrollTo(newQuestions.length - 1);
  }, 100);
}, [questions, carouselApi]);
```

#### 2. Replace Empty Spacer with Add Button (line 309)

Replace the empty spacer div with a conditional + button:

**Before:**
```tsx
<div className="w-10" />
```

**After:**
```tsx
{viewMode === "questions" ? (
  <button
    onClick={addQuestion}
    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors active:scale-95"
    title="დაამატე კითხვა"
  >
    <Plus className="w-5 h-5 text-white" />
  </button>
) : (
  <div className="w-10" />
)}
```

---

## Visual Design

The + button will:
- Appear only in "questions" view mode (when viewing/editing questions carousel)
- Match the header styling with white icon on purple background
- Have a circular shape (40x40px) matching the back button style
- Include hover and active states for feedback

---

## User Flow After Implementation

1. User opens an existing My Trivia Party to edit
2. User taps "კითხვების ნახვა" to view questions
3. User sees "კითხვა 1 / 1" header with + button on the right
4. User taps + button
5. New blank question is added and carousel navigates to it
6. User fills in the question and answers
7. User taps "შენახვა" to save all changes

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/social/EditRoundModal.tsx` | Add `addQuestion` function, replace spacer with + button in questions view |
