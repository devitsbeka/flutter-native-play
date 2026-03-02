

## Fix: Overly Strict Validation Marking Good Shortened Questions as "Unshortenable"

### Problem

The AI successfully shortens questions to valid lengths, but the post-AI validation (`isValidShortenedQuestion`) rejects them with overly strict rules, marking them as `unshortenable`. There are 65 English production questions stuck in this state.

Breakdown by rejection reason:

| Reason | Count | Issue |
|--------|-------|-------|
| No reason stored (AI returned `CANNOT_SHORTEN` or too long) | 47 | Legitimate -- AI couldn't do it |
| `too_much_reduction` | 14 | Overly strict -- a 266-char question shortened to 50 chars is only 19% of original, but that's *correct* behavior for very long questions |
| `no_question_mark` | 5 | Bug -- questions ending with quoted text like `'...them'?` confuse the check |
| `incomplete_sentence` | 1 | Edge case |

### Root Cause

The `MIN_REDUCTION_RATIO = 0.25` rule means the shortened version must be at least 25% of the original length. For a 200+ character question shortened to 50 chars, that's only ~20-25%, which fails. But shortening a 200-char question to 50 chars is exactly what we want -- the rule penalizes the AI for doing a *good* job on very long questions.

### Fix

**File: `supabase/functions/shorten-questions/index.ts`**

1. **Relax `MIN_REDUCTION_RATIO`** from `0.25` to `0.15` -- allows aggressive shortening of very long questions while still catching cases where the AI strips away too much meaning.

2. **Fix `no_question_mark` check** -- trim trailing whitespace and handle cases where `?` appears before a closing quote mark (e.g., `them'?`). The current check `trimmed.endsWith('?')` should work, so the issue is likely trailing whitespace or Unicode. Add `.replace(/\s+$/, '')` before checking.

3. **Reset the 20 falsely-rejected questions** (14 `too_much_reduction` + 5 `no_question_mark` + 1 `incomplete_sentence`) back to `shorten_status = NULL` so they get re-processed with the relaxed rules.

### Database Cleanup

```sql
UPDATE questions
SET shorten_status = NULL,
    quality_issues = NULL,
    original_question_text = NULL
WHERE language = 'en'
  AND shorten_status = 'unshortenable'
  AND is_active = true
  AND quality_issues IS NOT NULL;
```

This resets the 20 questions that were rejected by validation (not the 47 that the AI genuinely couldn't shorten).

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/shorten-questions/index.ts` | Lower `MIN_REDUCTION_RATIO` to 0.15, fix question mark detection edge case |
| Database | Reset 20 falsely-rejected questions |

