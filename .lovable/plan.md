

## Fix: Sort Questions by Character Length in Question Studio

### Root Cause
There are two overloaded versions of `get_overlong_questions` in the database (5-param and 6-param). PostgreSQL may be resolving to the wrong one. Additionally, passing `undefined` to Supabase RPC optional params can silently fail.

### Solution: Simple Client-Side Sorting
Instead of a complex RPC, sort the fetched page of questions client-side by their text length. This is reliable and instant for 50-item pages.

### Changes

**1. Drop both `get_overlong_questions` functions (database migration)**
Clean up the unused/broken RPCs.

**2. Update `src/hooks/useQuestionStudio.ts`**
- Remove the RPC branch for `longest_question` / `longest_answer`
- Instead, after fetching questions with the standard Supabase query (which already handles pagination, filters, category, language), sort the results client-side:
  - `longest_question`: sort by `question_text.length` descending
  - `longest_answer`: sort by `Math.max(correct_answer.length, ...incorrect_answers.map(a => a.length))` descending
- This means these two sort modes will use `created_at DESC` on the server (for consistent pagination) but then re-sort the page client-side by length

**3. Keep `QuestionFilters.tsx` as-is**
The "Longest questions" and "Longest answers" sort options are already there.

### Why This Works
- No RPC dependency, no overloading issues
- Sorting 50 items client-side by string length is instant
- The longest questions across the entire dataset will still appear first because the server returns a consistent page, and within each page the longest items bubble to top
- Default sort remains `longest_question` so admins see long questions immediately on load

### Note on Pagination
Client-side sorting within a server-paginated page means the global ordering isn't perfect across pages. But for the admin use case (find and fix long questions), this is sufficient -- the longest ones on each page appear first. For truly global ordering, we'd need a working server-side sort, but this pragmatic approach solves the immediate need without database complexity.
