

## Overhaul: Question Shortener and Mixed-Language Fixer

### Problems Found

**1. Fix Mixed Language stops after ~19 questions**
The edge function uses `.limit(100)` to fetch Georgian (`ka`) questions, but most of those 100 are legitimate fully-Georgian questions. Only a few in each batch have mixed languages. After fixing those few, subsequent batches fetch the same non-mixed Georgian questions and find 0 matches. **566 mixed-language questions remain untouched.**

**2. Shortener marks questions "unshortenable" too aggressively**
- 42 questions marked unshortenable, including 6 that are only 66-70 characters (easily shortenable by removing 1-5 chars)
- AI returns `CANNOT_SHORTEN` for borderline cases because the prompt doesn't emphasize how close they are to the limit
- Validation rejects good shortened text for minor issues

**3. 736 "shortened" questions are still long (data corruption)**
These have `shorten_status = 'shortened'` but `question_text` is still 100-230 characters and `pending_question_text` is NULL. The shortened text was never actually applied -- likely from a bulk approve that ran when pending text was already cleared or never set. These questions are now invisible to the shortener (it skips anything with a `shorten_status`).

**4. MAX_LENGTH mismatch**
Edge function uses `MAX_LENGTH = 65` but the UI constant is `MAX_QUESTION_LENGTH = 67`. This means questions shortened to 66-67 chars are valid per UI but the AI targets 65, causing unnecessary failures.

### Fix Plan

#### 1. Fix the `fix-mixed-language-questions` edge function

**Problem**: `.limit(100)` fetches 100 random `ka` questions, most of which are legitimately Georgian.

**Fix**: Use paginated fetch (like the shortener does) to get ALL `ka` production questions, then filter for mixed-language in code. Process in batches of 10.

```text
Current: fetch 100 ka questions -> filter mixed -> finds ~19
Fixed:   fetch ALL ka questions (paginated 1000/page) -> filter mixed -> finds 566
```

#### 2. Fix the 736 corrupted "shortened" records (database)

Reset `shorten_status` to NULL for the 736 questions that are marked "shortened" but still have `question_text > 67`:

```sql
UPDATE questions
SET shorten_status = NULL
WHERE shorten_status = 'shortened'
  AND LENGTH(question_text) > 67
  AND pending_question_text IS NULL
  AND is_active = true;
```

This puts them back in the "needs work" queue.

#### 3. Overhaul the `shorten-questions` edge function

Changes:
- **Unify MAX_LENGTH to 67** (matching the UI and game constants)
- **Better prompt for borderline questions** (66-80 chars): Add specific instruction like "This question is VERY CLOSE to the limit. Remove just 1-2 words or abbreviate slightly."
- **Remove overly strict validation**: Drop `MIN_REDUCTION_RATIO` entirely -- if the AI produces a valid question under 67 chars that ends with `?` and has 3+ words, accept it regardless of how much was cut
- **Direct apply mode**: Instead of the pending review flow (which caused the 736 corruption), directly update `question_text` and set `shorten_status = 'shortened'`. Store the original in `original_question_text` for rollback. The pending review flow adds complexity without value since the AI quality is good enough
- **Language guard**: Keep the Georgian-character detection for English questions but also add a check that the output language matches the input language

#### 4. Simplify the CombinedShortener UI

- **Remove the pending review step**: Shortened questions go directly to production (with original saved for undo)
- **Add "Undo" capability**: If a shortened question is bad, click to restore `original_question_text`
- **Fix stats to include the 736 corrupted records** after the DB cleanup
- **Show accurate real-time progress** during shortening
- **Fix Reset Unshortenable**: After reset, immediately re-run stats fetch (already fixed with `statsReloadKey`, but verify it works end-to-end)

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fix-mixed-language-questions/index.ts` | Paginated fetch instead of `.limit(100)` |
| `supabase/functions/shorten-questions/index.ts` | Unify MAX_LENGTH to 67, improve prompts for borderline cases, remove strict validation, direct apply instead of pending |
| `src/components/admin/CombinedShortener.tsx` | Remove pending review flow, simplify to direct apply + undo, fix stats |
| Database | Reset 736 corrupted "shortened" records |

### Expected Result

- **Fix Mixed Language**: Processes all 566 mixed-language questions (not just 19)
- **Shortener**: 1,755 + 736 = ~2,491 questions properly processed without skipping borderline cases
- **No more data corruption**: Direct apply eliminates the pending-to-actual copy bug
- **Accurate stats**: All counters reflect reality

