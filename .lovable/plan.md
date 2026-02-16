

## Fix: "უპს" Screen Appearing After Adding/Deleting Questions

### Root Cause

Two problems combine to trigger the error:

1. **`resolveCategoryUuid` uses `.single()`** (line 195-206 in `questionService.ts`): If the database query has any transient issue, `.single()` throws an error and returns `null`. This `null` flows into `getCategoryQuestions(undefined!, ...)`, causing `.eq('category_id', undefined)` to return 0 results, which triggers the "უპს" error screen.

2. **No guard against undefined `categoryUuid`** (line 251): The code calls `getCategoryQuestions(categoryUuid!, ...)` without checking if `categoryUuid` resolved successfully. If it's `undefined`, all subsequent queries silently return empty results.

3. **Stale question tracker**: When questions are deleted from the database, their IDs remain in `localStorage` tracker as "seen". While the fallback logic eventually clears the tracker, the initial count/validation may miscalculate exhaustion in edge cases.

### Fix

**File: `src/services/questionService.ts`**

1. Change `resolveCategoryUuid` to use `.maybeSingle()` instead of `.single()` (prevents PostgREST errors when 0 rows returned)

2. Add a null guard in `getQuestions` before calling `getCategoryQuestions`: if `categoryUuid` is null/undefined, return an empty result with a clear error log instead of passing `undefined` to all queries

3. In `getCategoryQuestions`, add a defensive check at the top: if `categoryUuid` is falsy, return empty result immediately

4. Clean stale IDs from the tracker: when Fallback 2 runs and fetches all questions for a category, intersect the tracker's seen IDs with the actual question IDs from the database, removing any stale (deleted) IDs

### Technical Details

**Change 1 -- `.maybeSingle()` (line 198):**
```typescript
const { data, error } = await supabase
  .from('categories')
  .select('id')
  .eq('category_id', slugOrUuid)
  .maybeSingle();  // was .single()
```

**Change 2 -- Null guard in `getQuestions` (line 248-251):**
```typescript
if (!categoryUuid) {
  console.error('[questionService] Could not resolve category:', ctx.categorySlug);
  return { questions: [], exhausted: false, language, categoryUuid: undefined };
}
```

**Change 3 -- Defensive check in `getCategoryQuestions` (top of function):**
```typescript
if (!categoryUuid) {
  return { questions: [], exhausted: true, language, exhaustionInfo: { totalAvailable: 0, totalSeen: 0, wasReset: false, usedFallback: false } };
}
```

**Change 4 -- Stale tracker cleanup (inside Fallback 2 block, after fetching all questions):**
After Fallback 2 fetches ALL valid question IDs for the category, intersect the tracker with actual IDs to remove stale references to deleted questions. This prevents tracker inflation from affecting future plays.

