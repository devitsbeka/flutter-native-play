

## Fix: English Questions Being Translated to Georgian During Shortening

### Problem

30 English questions (`language = 'en'`) have `pending_question_text` containing Georgian text. The AI model ignored the English prompt and output Georgian instead of shortened English. These are sitting in the "Pending Review" tab, showing Georgian translations instead of shortened English questions.

### Root Cause

The `shorten-questions` edge function correctly selects an English prompt for `language = 'en'` questions, but the prompt doesn't explicitly instruct the model to **keep the output in the same language**. The Gemini model, likely influenced by the app's Georgian-heavy context, outputs Georgian text.

### Fix (Two Parts)

#### 1. Clean up the 30 corrupted pending records (Database)

Reset the 30 English questions that got Georgian pending text so they can be re-processed:

```sql
UPDATE questions
SET shorten_status = NULL,
    pending_question_text = NULL,
    original_question_text = NULL
WHERE language = 'en'
  AND shorten_status = 'pending_review'
  AND pending_question_text ~ '[\u10A0-\u10FF]';
```

#### 2. Harden the English prompt in the edge function

**File:** `supabase/functions/shorten-questions/index.ts`

Add an explicit language instruction to the English prompt (around line 272):

```
CRITICAL: The output MUST be in English. Do NOT translate the question into another language.
Only shorten - do not change the language.
```

Also add a **post-processing validation** after the AI response: if the question is `language = 'en'` but the AI output contains Georgian characters (`[\u10A0-\u10FF]`), reject it and mark as `failed` for retry, rather than saving corrupted data.

**File:** `supabase/functions/shorten-answers/index.ts`

Apply the same language guard to the answer shortening function's English prompt to prevent the same issue there.

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/shorten-questions/index.ts` | Add "must stay in English" to prompt + post-AI Georgian detection guard |
| `supabase/functions/shorten-answers/index.ts` | Same language guard for answer shortening |
| Database | Reset 30 corrupted pending records |

### How It Works After Fix

1. The 30 corrupted records are reset to `shorten_status = NULL`, making them eligible for re-processing
2. When re-processed, the updated prompt explicitly tells the AI to keep the same language
3. If the AI still outputs Georgian for an English question, the validation guard catches it and marks it as `failed` instead of saving bad data
