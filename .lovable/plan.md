

## Fix: "შემოკლება" Button Does Nothing

### Root Cause

The edge function `shorten-answers` filters questions by `answer_shorten_status IS NULL` (line 84). Most questions with long answers already have a status set from previous processing runs (`shortened`, `partially_shortened`, `failed`, etc.), so they get **zero results** and the function returns immediately with `done: true, processed: 0`.

The network request IS being made, but the response says "nothing to do" because all questions are already marked as processed.

### Fix (2 changes)

#### 1. Edge function: Skip status filter when specific `questionIds` are provided
In `supabase/functions/shorten-answers/index.ts`, when `questionIds` array is passed, do NOT filter by `answer_shorten_status`. The user explicitly selected these questions, so process them regardless of previous status.

```typescript
// Only apply status filter when processing by category (no specific IDs)
if (!questionIds || questionIds.length === 0) {
  if (aggressiveMode) {
    query = query.or("answer_shorten_status.is.null,answer_shorten_status.eq.shortened");
  } else {
    query = query.is("answer_shorten_status", null);
  }
}
```

#### 2. Hook: Pass `aggressiveMode: true` from the top-bar button
In `src/hooks/useQuestionStudio.ts`, when calling from the top bar (no `specificIds`), pass `aggressiveMode: true` so it re-processes questions that still have long answers even if they were previously marked.

```typescript
body: {
  categoryId: catId || 'all',
  inProduction: inProd,
  language: lang || 'all',
  questionIds: specificIds,
  aggressiveMode: !specificIds, // re-process when doing category-wide
},
```

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/shorten-answers/index.ts` | Skip `answer_shorten_status` filter when `questionIds` is provided |
| `src/hooks/useQuestionStudio.ts` | Add `aggressiveMode: true` for top-bar (category-wide) shortening |

