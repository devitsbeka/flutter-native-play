

## Fix: Slow Next-Level Loading in Category Mode

### Problem
Loading the next level takes too long because the system makes 5-6 sequential database queries, including 3 redundant category lookups and a full table scan of all category questions.

### Root Cause Analysis

When a user finishes a level and taps "Next Level", this sequence runs:

1. **CategoryQuizPage** queries `categories` table (slug -> name, icon_slug) -- ~100ms
2. **getQuestions** calls `resolveCategoryUuid` which queries `categories` AGAIN (slug -> UUID) -- ~100ms
3. **getCategoryQuestions** calls `getCategoryInfo` which queries `categories` a THIRD time (UUID -> name) -- ~100ms
4. **Full table scan**: fetches ALL questions in the category to count valid ones for exhaustion detection -- ~200-500ms (scales with category size)
5. **Level-range query**: fetches the actual questions to play -- ~100ms
6. **Possible fallback**: if not enough questions, another query -- ~100ms

Total: ~600-1000ms of sequential network requests, most of which are redundant.

### Solution

**1. Eliminate duplicate category lookups (3 queries -> 1)**

Pass the already-resolved category data from `CategoryQuizPage` into `getQuestions` via the existing `categoryUuid` field. Add a `categoryName` field to `QuestionContext` so `getCategoryQuestions` doesn't need to re-fetch it.

- `CategoryQuizPage` already fetches `categoryData` (line 242). Pass `categoryData.id` as `categoryUuid` and `categoryData.name` as `categoryName` to skip both `resolveCategoryUuid` and `getCategoryInfo`.

**2. Run category lookup and exhaustion count in parallel (sequential -> parallel)**

The category info query and the exhaustion count query are independent. Run them with `Promise.all` instead of sequentially.

**3. Use COUNT query instead of full fetch for exhaustion detection**

Currently the code fetches ALL question rows (id, question_text, correct_answer, incorrect_answers) just to count valid ones client-side. Since the validation filters (text length, answer count) disqualify very few questions in practice, we can use a lightweight `SELECT id, count(*)` approach or simply use the DB count as a good-enough estimate, avoiding the heavy data transfer.

### Technical Changes

**File: `src/services/questionService.ts`**

- Add `categoryName?: string` to `QuestionContext` interface
- In `getQuestions`: skip `resolveCategoryUuid` when `categoryUuid` is already provided
- In `getCategoryQuestions`: skip `getCategoryInfo` when `categoryName` is passed through; accept it as parameter
- Replace the full `allCategoryQs` fetch with a `SELECT count(*)` (head-only) query for exhaustion detection
- Run remaining independent queries with `Promise.all`

**File: `src/pages/CategoryQuizPage.tsx`**

- Pass `categoryUuid: categoryData.id` and `categoryName: categoryData.name` in the `getQuestions` call so the service doesn't re-fetch category info

### Expected Improvement

- From 5-6 sequential queries (~600-1000ms) down to 2 parallel queries (~150-200ms)
- The heavy full-table scan is replaced with a lightweight count query
- No behavioral changes -- same questions, same exhaustion detection, same fallback logic
