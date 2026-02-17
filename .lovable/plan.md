

## Fix: Enable Answer-Based Search in Question Studio

### Problem
The search in the Question Studio admin page only matches against `question_text`. The previous fix was applied to a different hook (`useAdminQuestions.ts`), but the Question Studio uses its own hook (`useQuestionStudio.ts`) which was never updated.

### Solution
Update two places in `src/hooks/useQuestionStudio.ts` where the search filter is applied (the count query and the data query) to use Supabase's `.or()` filter instead of `.ilike()`, matching the same pattern already used in `useAdminQuestions.ts`.

### Technical Details

**File: `src/hooks/useQuestionStudio.ts`**

Replace the search filter on both the count query (line 163) and data query (line 211) from:
```
.ilike('question_text', '%search%')
```
to:
```
.or('question_text.ilike.%search%,correct_answer.ilike.%search%,incorrect_answers::text.ilike.%search%')
```

This will allow searching questions by:
- Question text
- Correct answer
- Any of the incorrect answers

No other files need to change -- the UI already passes the search term correctly.

