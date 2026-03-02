

## Fix: Ensure RPC Parameters Use `null` Instead of `undefined`

### Root Cause
The `fetchQuestions` function in `useQuestionStudio.ts` passes `undefined` for optional RPC parameters (lines 243-247). The Supabase JS client silently drops `undefined` params from the request body, meaning PostgreSQL never receives them. This can cause the RPC call to either fail silently or return unexpected results.

### Changes

**1. Update `src/hooks/useQuestionStudio.ts` (lines 240-250)**

Replace all `|| undefined` with `|| null` in the RPC call to `get_questions_sorted_by_length`:

```typescript
const { data: rpcData, error: rpcError } = await supabase.rpc('get_questions_sorted_by_length', {
  p_sort_mode: filters.sortBy,
  p_in_production: inProd,
  p_category_id: selectedCategoryId ?? null,
  p_language: language !== 'all' ? language : null,
  p_question_type: filters.questionType ?? null,
  p_difficulty: filters.difficulty ?? null,
  p_has_icon: filters.hasIcon === null ? null : (filters.hasIcon ? 'with' : 'without'),
  p_limit: PAGE_SIZE,
  p_offset: offset,
});
```

This ensures all parameters are explicitly sent to the database function, allowing PostgreSQL to properly evaluate the `IS NULL` checks in the WHERE clause.

**2. Add error logging for debugging**

Add a `console.log` before the RPC call to confirm it's being triggered, and log the response to verify sorting order. This can be removed after confirming the fix works.

### Why This Will Work
- PostgreSQL function's WHERE clause uses `p_category_id IS NULL OR ...` patterns
- When Supabase JS omits `undefined` params, PostgreSQL uses the function defaults (`NULL`)
- However, if Supabase JS sends fewer params than expected, it may fail to match the function signature entirely
- Sending explicit `null` values ensures the correct function is called with all 9 parameters

### No Other Changes Needed
- The database function `get_questions_sorted_by_length` already exists and works correctly
- The filter UI already has the sort options
- Default sort is already `'longest_question'`

