

## Fix Shortener Logic: Language Filter and Progress Counter

### Problems Found

**Bug 1: `shorten-questions` ignores language filter**
- The edge function on line 133 destructures `{ categoryId, testMode, inProduction }` but does NOT extract the `language` parameter
- The client sends `language: languageFilter === 'all' ? undefined : languageFilter` but the function never reads it
- Result: when you pick "English", it still processes Georgian questions because the query has no language filter
- `shorten-answers` correctly reads `language` on line 60 and filters on lines 88-90

**Bug 2: Progress counter exceeds total (e.g., "155 out of 110")**
- The while-loop calls BOTH `shorten-questions` and `shorten-answers` each iteration
- These two functions return different, overlapping sets of questions (questions with long text vs questions with long answers)
- Results are merged by ID, but when they DON'T overlap, the `allResults` array grows with items from both functions independently
- `progress.total` is set to `stats.needsWork` which counts unique questions needing EITHER long question OR long answers -- but processed count can exceed this because both functions independently batch through their own queues at different rates
- The `remaining` calculation `Math.max(qData?.remaining, aData?.remaining)` is also unreliable since the two functions track separate remaining counts

### Fix Plan

#### 1. Fix language filter in `shorten-questions` edge function
**File:** `supabase/functions/shorten-questions/index.ts`
- Line 133: Add `language` to destructured params: `{ categoryId, testMode, inProduction, language }`
- After line 159: Add language filter to query:
```typescript
if (language && language !== "all") {
  query = query.eq("language", language);
}
```

#### 2. Fix progress tracking in `CombinedShortener.tsx`
**File:** `src/components/admin/CombinedShortener.tsx`

Change the progress logic to track actual processed count correctly:
- Track question and answer processing separately with independent `done` flags
- Only continue the while-loop until BOTH are done
- Use the `resultMap` size (unique question IDs) as the processed count instead of raw array length
- Compute `total` dynamically: use `Math.max(allResults.length, stats.needsWork)` to prevent "X out of Y" where X > Y, or better yet, show the actual processed count against the running total from remaining counts
- Update progress calculation:
  - `total`: Use `allResults.length + Math.max(qData?.remaining || 0, aData?.remaining || 0)` for a dynamic total that adjusts as processing reveals the actual scope
  - `processed`: Use `allResults.length` (unique merged results)

This prevents the counter from showing more processed than total.

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/shorten-questions/index.ts` | Add `language` parameter extraction and DB query filter |
| `src/components/admin/CombinedShortener.tsx` | Fix progress total calculation to prevent exceeding total |

