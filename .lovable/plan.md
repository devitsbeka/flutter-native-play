

## Fix English Question Shortener: Translation + Count Issues

### Problems Found

1. **47 corrupted English answers in pending review** -- previous shortening runs translated English answers into Georgian (e.g., "Irving trial significance" became "ირვინგის პროცესი"). Approving these would save Georgian text into English questions.

2. **Pending review tab doesn't filter by language** -- `loadPendingQuestions()` (line 618-656) is missing the `languageFilter` check, so Georgian and English pending items are mixed together regardless of the language dropdown selection.

3. **Edge functions hit 1,000-row limit** -- Both `shorten-questions` and `shorten-answers` edge functions fetch questions with a simple `.select()` (no pagination). With 2,073 English production questions still needing shortening, only the first 1,000 are ever seen. This is why the count appears low and many questions are never processed.

### Fix Plan

#### 1. Database Cleanup -- Reset 47 corrupted English pending answers

```sql
UPDATE questions
SET answer_shorten_status = NULL,
    pending_correct_answer = NULL,
    pending_incorrect_answers = NULL,
    original_correct_answer = NULL,
    original_incorrect_answers = NULL
WHERE language = 'en'
  AND answer_shorten_status = 'pending_review'
  AND (
    pending_correct_answer ~ '[\u10A0-\u10FF]'
    OR pending_incorrect_answers::text ~ '[\u10A0-\u10FF]'
  );
```

Also reset any corrupted English pending question text:

```sql
UPDATE questions
SET shorten_status = NULL,
    pending_question_text = NULL,
    original_question_text = NULL
WHERE language = 'en'
  AND shorten_status = 'pending_review'
  AND pending_question_text ~ '[\u10A0-\u10FF]';
```

#### 2. Fix `loadPendingQuestions` in `CombinedShortener.tsx`

Add the missing language filter to the pending questions query (around line 627):

```typescript
if (languageFilter !== 'all') {
  query = query.eq('language', languageFilter);
}
```

#### 3. Add pagination to both edge functions

**File: `supabase/functions/shorten-questions/index.ts`** (lines 146-168)

Replace the single fetch with a paginated loop (batch of 1,000) to ensure all 7,000+ questions are considered:

```typescript
let allQuestions: Question[] = [];
let page = 0;
const FETCH_PAGE_SIZE = 1000;
let hasMore = true;

while (hasMore) {
  const { data, error } = await query.range(page * FETCH_PAGE_SIZE, (page + 1) * FETCH_PAGE_SIZE - 1);
  if (error) throw error;
  if (data && data.length > 0) allQuestions.push(...data);
  if (!data || data.length < FETCH_PAGE_SIZE) hasMore = false;
  page++;
}
```

**File: `supabase/functions/shorten-answers/index.ts`** (lines 74-107)

Same paginated fetch pattern.

### Files to Modify

| File | Change |
|------|--------|
| Database | Reset 47 corrupted English pending answers + any corrupted pending questions |
| `src/components/admin/CombinedShortener.tsx` | Add `languageFilter` to `loadPendingQuestions()` query |
| `supabase/functions/shorten-questions/index.ts` | Paginate the question fetch to handle 7,000+ rows |
| `supabase/functions/shorten-answers/index.ts` | Paginate the question fetch to handle 7,000+ rows |

### Result After Fix

- Pending review tab will correctly show only English (or Georgian) items based on the language filter
- No more Georgian-translated text appearing when approving English questions
- All 2,073+ long English production questions will be found and processed (not just the first 1,000)
- Stats will accurately reflect the true count of questions needing work

