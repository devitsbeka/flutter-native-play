

## Plan: AI Answer Shortener for Sentence-Length Answers

### Problem

Many questions have answers that are full sentences (40-80+ characters) instead of concise quiz options (max 20 chars). The existing `shorten-answers` edge function flags these as `needs_rewrite` and **skips them** instead of actually shortening them. This means hundreds of long answers remain unfixed.

Examples from your screenshot:
- "The model overfits to the outliers, leading to poor generalization on typi..." → should be something like "Overfits outliers"
- "Gradient explosion or vanishing occurs, preventing effective learning." → "Gradient explosion"

### Root Cause

In `supabase/functions/shorten-answers/index.ts` line 169, the `looksLikeSentence()` check flags any answer with 5+ words and sentence-like patterns as `needs_rewrite` and skips AI processing entirely. This was overly conservative — most of these **can** be shortened by extracting the key concept.

### Fix

#### 1. Remove the `needs_rewrite` bypass in `shorten-answers` edge function

Instead of skipping sentence-like answers, send them to AI with an enhanced prompt that instructs the model to **extract the core concept** from a sentence answer and turn it into a concise quiz button label (max 20 chars).

Change: Remove the early `continue` on line 192 for sentence answers. Instead, use a stronger prompt variant for these cases:

```text
"Adversarial perturbations are spontaneously generated within the model"
→ Extract core concept → "Adversarial generation"

"The model overfits to the outliers, leading to poor generalization"  
→ Extract core concept → "Overfits outliers"
```

#### 2. Switch to Direct Apply mode

Currently the function saves to `pending_correct_answer` / `pending_incorrect_answers` columns for manual review. For bulk processing, switch to direct apply (like question shortener does): write shortened answers directly to `correct_answer` / `incorrect_answers`, archive originals in `original_correct_answer` / `original_incorrect_answers`.

#### 3. Add a "rewrite" prompt path for sentence answers

Add a second prompt variant specifically for sentence-to-keyword conversion:

```text
These answers are full sentences. Extract the KEY CONCEPT as a quiz button label.
Max 20 characters. The answer must still be factually correct for the question.

Example transformations:
- "It reduces the learning rate gradually" → "Reduces learning rate"
- "The process of photosynthesis occurs" → "Photosynthesis"  
- "Carbon dioxide is released into the atmosphere" → "CO₂ released"
```

#### 4. Reset `needs_rewrite` and `unshortenable` statuses via migration

Clear stuck statuses so these questions re-enter the processing queue:

```sql
UPDATE questions 
SET answer_shorten_status = NULL
WHERE answer_shorten_status IN ('needs_rewrite', 'unshortenable')
  AND is_active = true;
```

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/shorten-answers/index.ts` | Remove `needs_rewrite` bypass, add sentence-to-keyword prompt, switch to direct apply mode with validation |
| Database migration | Reset stuck `needs_rewrite`/`unshortenable` statuses to NULL |

### Safety

- Originals are archived in `original_correct_answer` / `original_incorrect_answers` columns before overwriting
- Strict post-processing validation: reject any AI output still >20 chars
- Georgian character guard remains for English questions
- Admin can still use CombinedShortener UI to monitor progress and reset individual questions

