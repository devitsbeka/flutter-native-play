

## Add Answer Search to Question Studio

### Problem
The search in the Question Studio admin panel only matches against `question_text`. Searching for an answer string (e.g., a correct or incorrect answer) returns no results.

### Solution
Extend the search filter in `src/hooks/useAdminQuestions.ts` to also match against `correct_answer` and the `incorrect_answers` array, using Supabase's `.or()` filter.

### Technical Details

**File: `src/hooks/useAdminQuestions.ts`**

Two places need updating (the count query on line 44 and the data query on line 71):

**Current code (both places):**
```
query = query.ilike('question_text', `%${normalizedSearch}%`);
```

**New code (both places):**
```
query = query.or(
  `question_text.ilike.%${normalizedSearch}%,correct_answer.ilike.%${normalizedSearch}%,incorrect_answers::text.ilike.%${normalizedSearch}%`
);
```

This uses Supabase's `.or()` to match the search term against:
1. `question_text` -- the question itself
2. `correct_answer` -- the correct answer
3. `incorrect_answers::text` -- casts the JSON array to text for substring matching

No database changes needed. Single file edit, two lines changed.

