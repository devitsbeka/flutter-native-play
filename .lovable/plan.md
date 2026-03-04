

## Add "Shorten Long Answers" Feature to Question Studio

### Problem
Question Studio has no way to shorten answers. The CombinedShortener tool on the Tools page doesn't work. You want to sort by longest answers, see those questions, and shorten them in bulk — all from Question Studio.

### Solution
Add a **"Shorten Answers" bulk action button** to Question Studio that appears when questions are selected (or as a top-bar action). When clicked, it calls the existing `shorten-answers` edge function on the selected questions (or all visible questions with long answers).

### Implementation

#### 1. Add a "Shorten Long Answers" button to `QuestionStudio.tsx`
Add a new button in the top bar (next to "Bulk Generator") that:
- Counts how many visible questions have answers > 20 chars
- When clicked, processes them in batches through the `shorten-answers` edge function
- Shows progress (processing count / total)
- Refreshes the question list after completion

#### 2. Add `bulkShortenAnswers` method to `useQuestionStudio.ts`
New method that:
- Finds all currently loaded questions with any answer > 20 characters
- Calls `supabase.functions.invoke('shorten-answers', { body: { categoryId, inProduction, language } })`
- Loops in batches until `done: true` or `remaining: 0`
- Calls `refetch()` after completion

#### 3. Show answer lengths in QuestionList items
When sorted by `longest_answer`, display a small badge showing the max answer length on each question card so you can see which answers are too long.

#### 4. Add to BulkActionsBar
When questions are selected, add a "✨ Shorten Answers" action button that shortens only the selected questions' answers.

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useQuestionStudio.ts` | Add `bulkShortenAnswers()` method that calls the edge function in a loop |
| `src/pages/admin/QuestionStudio.tsx` | Add "Shorten Answers" button in top bar with progress state |
| `src/components/admin/studio/QuestionList.tsx` | Show max answer length badge when sorted by `longest_answer` |
| `src/components/admin/studio/BulkActionsBar.tsx` | Add "Shorten Answers" option to bulk actions |

### Flow
1. Open Question Studio → sort by "გრძელი პასუხები" (longest answers)
2. See questions with answer length badges (e.g., "42 chars")
3. Click "Shorten Answers" in top bar → processes ALL questions with long answers for current category/language/production filters
4. Or: select specific questions → use bulk action "Shorten Answers" for just those
5. Progress indicator shows batch count
6. Questions refresh automatically after completion

