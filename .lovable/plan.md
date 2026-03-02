

## Fix Mixed-Language Questions: Georgian Text + English Answers

### Problem

There are **729 production questions** tagged as `language: ka` (Georgian) where the question text is in Georgian but ALL answers are in English/Latin script. This creates an inconsistent user experience -- questions should be fully in one language.

### Data Breakdown

| Situation | Count |
|-----------|-------|
| Georgian question + ALL English answers | 690 |
| Georgian question + mixed answers (some Georgian, some English) | 39 |
| Already have an English duplicate (same category + same correct answer) | 135 |
| No English duplicate exists | 555 |

Top affected categories: Video Games (111), Social Media (75), Math (68), Technology (60), Programming (58), Pop Culture (37), Anime/Manga (35).

### Strategy

These questions need to be converted to fully English. Since the answers are already English, we only need to translate the Georgian question text to English.

#### Step 1: Deactivate duplicates (135 questions)

For the 135 questions that already have an English equivalent in the database, simply deactivate them to avoid redundancy:

```sql
UPDATE questions SET is_active = false
WHERE id IN (
  SELECT q1.id FROM questions q1
  WHERE q1.language = 'ka' AND q1.is_active = true AND q1.in_production = true
    AND q1.question_text ~ '[\u10A0-\u10FF]'
    AND q1.correct_answer !~ '[\u10A0-\u10FF]'
    AND EXISTS (
      SELECT 1 FROM questions q2
      WHERE q2.category_id = q1.category_id
        AND q2.correct_answer = q1.correct_answer
        AND q2.language = 'en' AND q2.is_active = true
    )
);
```

#### Step 2: Create edge function to batch-translate remaining 594

Create a new edge function `fix-mixed-language-questions` (adapted from the existing `restore-english-questions` pattern) that:

1. Fetches questions where `language = 'ka'`, question text contains Georgian chars, and answers don't contain Georgian chars
2. Translates only the question text to English using the AI gateway (answers are already English, so they stay as-is)
3. For the 39 partially-mixed ones, also translates any Georgian incorrect answers
4. Updates each question: sets `language = 'en'`, `in_production = false` (for review before going live)
5. Processes in batches of 10 with character limit validation (65 chars question, 20 chars answer)

#### Step 3: Add a trigger button in the admin UI

Add a "Fix Mixed Language" action in the admin Tools area (or CombinedShortener) to invoke this function and track progress.

### Files to Create/Modify

| File | Change |
|------|--------|
| Database | Deactivate 135 duplicate questions |
| `supabase/functions/fix-mixed-language-questions/index.ts` | New edge function to translate Georgian question text to English |
| `src/components/admin/CombinedShortener.tsx` (or Tools area) | Add button to trigger the fix and show progress |

### Result

- All 729 mixed-language questions will be cleaned up
- 135 duplicates deactivated
- ~594 questions converted to fully English and moved to Library for review
- No more Georgian-question + English-answer combinations in production

