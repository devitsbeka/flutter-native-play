

## Keep Shortened Questions Visible & Marked in Question Studio

### Problem
After shortening, `clearSelection()` is called and `fetchQuestions()` reloads the list — the user loses track of which questions were just shortened and can't see the before/after results.

### Solution

Two changes:

#### 1. Don't clear selection after shortening (`useQuestionStudio.ts`)
- Remove `clearSelection()` call from `bulkShortenAnswers` 
- After `fetchQuestions()`, keep the selected IDs intact so the user can still see which questions were processed
- Update the local `questions` array in-place after shortening instead of just refetching (so the user sees changes immediately)

#### 2. Mark shortened questions visually in the list (`QuestionList.tsx`)
- After shortening completes, store the set of just-shortened question IDs in state (e.g. `shortenedIds`)
- In the question list, show a small visual indicator (e.g. a green "✂ შემოკლდა" badge) next to questions that were just shortened
- This badge persists until the user navigates away or clears it manually
- The preview panel already shows the current answer text, so the user can click through selected questions to review results

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useQuestionStudio.ts` | Add `shortenedIds` state. In `bulkShortenAnswers`: remove `clearSelection()`, store processed IDs in `shortenedIds`, keep selection after refetch. Expose `shortenedIds` and `clearShortenedIds`. |
| `src/components/admin/studio/QuestionList.tsx` | Accept `shortenedIds` prop, show a "✂ შემოკლდა" badge on questions in that set. |
| `src/pages/admin/QuestionStudio.tsx` | Pass `shortenedIds` to `QuestionList`, call `clearShortenedIds` when appropriate (e.g. on page/filter change). |

