
## Fix Duplicate Question Scanner

### Problem
The scanner says "no duplicates found" even though there are **119 question texts with exact duplicates** across 8,650 active questions. The root cause is that the Supabase client has a **default limit of 1,000 rows per query**. The scanner's query fetches at most 1,000 questions, meaning it only compares a fraction of the database.

### Solution

**File: `src/hooks/useDuplicateDetection.ts`** -- `scanDatabaseForDuplicates` function

Replace the single query with a **paginated fetch** that loads all questions in batches of 1,000 until the full set is retrieved. Then run the existing comparison logic on the complete dataset.

Changes:
1. Create a helper function `fetchAllQuestions(categoryId?)` that paginates through the `questions` table in chunks of 1,000 using `.range()`, accumulating all results.
2. Update `scanDatabaseForDuplicates` to use this helper instead of the current single query.
3. Also update `checkForDuplicates` (the import-time checker) with the same paginated fetch for consistency.

### Technical Details

```text
Current flow:
  query.eq('is_active', true) --> returns max 1000 rows --> compare

Fixed flow:
  page 0: range(0, 999)    --> 1000 rows
  page 1: range(1000, 1999) --> 1000 rows
  ...
  page N: range(N*1000, ...) --> < 1000 rows (done)
  --> merge all --> compare all pairs
```

The comparison logic (O(n^2) with early exits) remains unchanged -- it already works correctly. Only the data fetching is broken.

### Additional improvement
Since the scanner UI shows 80% threshold by default but the user screenshot shows it still finds nothing, this confirms the data fetching is the sole issue. Georgian text keywords work fine with the Jaccard similarity -- exact duplicates would score 1.0 and be caught at any threshold.
