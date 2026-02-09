
## Fix Question Repetition in Category Mode

### Problem
Users are seeing repeated questions after just 2-3 questions when playing categories like "ქართული ლიტერატურა". This happens because:

1. **Duplicate questions exist in the database** -- 6 pairs of identical questions (same text + same answer) with different IDs. Since each has a different ID, the deduplication tracker treats them as separate questions, so users see the "same" question twice.
2. **No database-level randomization** -- the query uses `limit(100)` without any random ordering, meaning it always fetches the same first 100 rows. This reduces variety.
3. **Limited fetch window** -- only 100 questions are fetched per query, even when 177+ are available in the level range.

### Fix Plan

#### Step 1: Deactivate duplicate questions in the database
Hide one copy of each true duplicate (same question_text + same correct_answer) so users never encounter them:

```sql
-- Deactivate duplicates (keep the first one, hide the second)
UPDATE questions SET in_production = false 
WHERE id IN (
  'c280f334-1d4e-4d32-87d0-12fb3053c10e',  -- გეოგრაფია duplicate
  'bd17ed2a-6c33-45fb-9461-045bff7d4512',  -- მეცნიერება duplicate  
  'c04bee00-214a-4aa7-9f99-888f7b044cb1',  -- პოლიტიკა duplicate
  '319f35a5-171b-4bd5-b13b-08f636646370',  -- ფილოსოფია duplicate
  'd751415c-f908-44bf-b0c9-e669f05d456e',  -- ქართული ლიტერატურა duplicate
  '43d6f9ec-96f3-48e2-8b55-4ba6c1636a1e'   -- ცხოველები duplicate
);
```

#### Step 2: Improve question fetching in `questionService.ts`

**File: `src/services/questionService.ts`** -- `getCategoryQuestions` function

- Remove the `limit(100)` cap -- fetch ALL valid questions from the category/level range, then shuffle and pick client-side. With ~200 questions per category, this is perfectly fine for performance.
- This ensures full pool coverage and true random selection from the entire available set.
- Apply the same fix to fallback queries (fallback 1 and fallback 2).

Changes:
- Line 331: Remove `.limit(100)` from primary query
- Line 351: Remove `.limit(100)` from fallback 1 query
- Line 368: Remove `.limit(100)` from fallback 2 query

#### Step 3: Add current-session deduplication in `CategoryQuizPage.tsx`

**File: `src/pages/CategoryQuizPage.tsx`**

- Pass the current session's question IDs as `excludeIds` to `getQuestions()` to provide an extra safety net against repeats within and across sessions:

```typescript
const result = await getQuestions({
  mode: 'category',
  categorySlug: categoryId,
  levelNumber,
  count: 5,
  excludeIds: questionIds, // pass previously loaded question IDs
});
```

This ensures that even if localStorage tracking has gaps, the currently loaded questions are always excluded.

### Summary of changes
| What | Where | Why |
|------|-------|-----|
| Deactivate 6 duplicate question pairs | Database | Same question with different IDs bypasses tracking |
| Remove `limit(100)` on queries | `questionService.ts` | Ensures full pool is considered, not just first 100 rows |
| Pass session question IDs as excludeIds | `CategoryQuizPage.tsx` | Extra safety layer against repeats |
