

## Fix: Question Shortener Shows "No Questions Need Shortening"

### Root Cause

The CombinedShortener stats query (`loadStats`) fetches questions from the database to count how many need shortening. However, it uses a simple `.select()` without pagination, which hits the **default 1,000 row limit**. With **7,158 active English production questions**, the query only returns the first 1,000 rows. If those 1,000 happen to already have a `shorten_status` set, the component reports 0 questions needing work -- even though there are **2,350+ questions** that still need shortening.

### The Fix

**File:** `src/components/admin/CombinedShortener.tsx`

Replace the single stats query (lines 147-160) with a **paginated fetch** that retrieves all rows in batches of 1,000, similar to the pattern already used in `useDuplicateDetection.ts` (`fetchAllQuestions`).

```text
Current (broken):
  let query = supabase.from('questions').select('id, question_text, ...')
  // Returns max 1,000 rows silently

Fixed (paginated):
  Fetch in batches of 1,000 using .range(offset, offset + 999)
  Continue until a batch returns fewer than 1,000 rows
  Combine all results, then compute stats
```

### Technical Details

1. **Create a paginated fetch helper** inside the `loadStats` function:
   - Use `.range(from, to)` in a loop with batch size 1,000
   - Accumulate all rows into a single array
   - Stop when a batch returns fewer than 1,000 rows

2. **Apply the same fix** to any other queries in CombinedShortener that might hit this limit (the pending review load at ~line 598, and needs_rewrite load at ~line 722 are likely safe since they filter by status, but will verify).

3. **No other files need changes** -- the edge functions and shortening logic itself work correctly; it's purely the client-side stats counting that undercounts.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/CombinedShortener.tsx` | Replace stats query with paginated fetch to handle 7,000+ rows |

