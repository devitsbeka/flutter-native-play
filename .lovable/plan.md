

## Clean Up Georgian Questions Mislabeled as English in Anime/Manga

### Current State
- **34 questions** in category Anime/Manga have `language = 'en'` but contain Georgian text
- All 34 are already `is_active = false` and `quality_status = 'rejected'`
- None are in production -- no user-facing impact currently

### Action

Run a single database update to fix the language tag on these 34 records:

```sql
UPDATE questions
SET language = 'ka'
WHERE category_id = 'b9a45cde-fa7a-47e4-bdd2-35b58085b95d'
  AND language = 'en'
  AND (
    question_text ~ '[\u10A0-\u10FF]'
    OR correct_answer ~ '[\u10A0-\u10FF]'
    OR incorrect_answers::text ~ '[\u10A0-\u10FF]'
  );
```

This corrects their language to `ka` (Georgian) so they won't appear in any English-filtered queries or reviews. They remain inactive/rejected -- no content changes, just a label fix.

### Files to Modify
None -- this is a data-only fix via a database update.

