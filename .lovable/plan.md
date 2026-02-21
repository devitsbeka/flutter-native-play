
## Fix Slow Question Loading Between Category Rounds

### Root Cause

When transitioning between levels in category mode, two bottlenecks cause the long "კითხვების გენერირება..." loading screen:

1. **Redundant category DB lookup**: Every level transition re-fetches category info (`categories` table) even though `dbCategory` is already loaded from the previous level and the category doesn't change between levels.

2. **Fetching ALL questions without limit**: The question queries in `questionService.ts` have no `.limit()` clause. Categories contain 200-370+ questions, and ALL rows are fetched from the database, transferred over the network, and filtered client-side -- just to pick 5. This is the primary bottleneck.

### Solution

**File: `src/pages/CategoryQuizPage.tsx`**

- Skip the category DB lookup (`supabase.from('categories').select(...)`) when `dbCategory` is already populated (i.e., when navigating between levels within the same category). Use the cached `dbCategory` directly, saving one network round-trip.

**File: `src/services/questionService.ts`**

- Add `.limit(50)` to the main question query in `getCategoryQuestions()` (line ~347). Since we only need 5 questions and already exclude seen IDs server-side, fetching 50 provides ample variety for shuffling while dramatically reducing data transfer.
- Add `.limit(50)` to Fallback 1 query (full level range, line ~367).
- Add `.limit(50)` to Fallback 2 query (no exclusions, line ~383). This one can keep a larger limit since it's a last resort.
- Add `.limit(50)` to the retry query after invalid-question detection (line ~419).

### Expected Impact

- Eliminates 1 unnecessary DB query per level transition (category lookup)
- Reduces data transfer from ~200-370 rows to max 50 rows per query
- Expected loading time reduction from ~1000ms+ to ~200-300ms
