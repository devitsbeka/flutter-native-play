

## Fix Mixed-Language Answer Corruption from Shortening

### Root Cause

The screenshot shows an English question ("What fueled the 18th-century Industrial Revolution in Britain?") with Georgian incorrect answers ("მეცნიერული აღმოჩენა", "მოსახლეობის ზრდა"). This happened because:

1. The shortening function processes all 4 answers together — if the AI returns some answers in Georgian for an English question, the current guard only catches it when **all** outputs are Georgian. It misses **partially** mixed output.
2. The AI may also be "translating" short English answers into Georgian when the question has some existing Georgian content.

### Plan

#### 1. Fix corrupted questions immediately (DB query)

Run a query to find all English questions that now have Georgian characters in their answers, and restore them from the `original_correct_answer` / `original_incorrect_answers` backup columns.

```sql
-- Find English questions with Georgian answers and restore originals
UPDATE questions 
SET correct_answer = original_correct_answer,
    incorrect_answers = original_incorrect_answers,
    answer_shorten_status = NULL,
    original_correct_answer = NULL,
    original_incorrect_answers = NULL
WHERE language = 'en'
  AND answer_shorten_status IS NOT NULL
  AND original_correct_answer IS NOT NULL
  AND (
    correct_answer ~ '[\u10A0-\u10FF]'
    OR incorrect_answers::text ~ '[\u10A0-\u10FF]'
  );
```

#### 2. Harden the edge function (`supabase/functions/shorten-answers/index.ts`)

Strengthen the Georgian guard to check **each individual answer** instead of just checking if any output has Georgian:

- For English questions: reject if **any single** output answer contains Georgian characters
- Add a per-answer language consistency check before writing to DB
- Also add a guard for Georgian questions getting Latin-only answers

| File | Change |
|------|--------|
| `supabase/functions/shorten-answers/index.ts` | Per-answer language validation, reject any mixed output |
| Database migration | Restore corrupted English questions from backup columns |

