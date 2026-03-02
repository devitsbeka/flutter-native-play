

## Fix: Unshortenable Questions Cleanup

### Problem

99 questions are stuck with `shorten_status = 'unshortenable'`, shown in red. Two issues:

1. **9 are already short enough** (≤67 chars) -- they were incorrectly flagged by the old 65-char limit. They just need their status cleared.
2. **90 are still too long** (>67 chars) -- the AI failed to shorten them previously. They need to be re-queued.
3. **96 of 99 are in production** -- players see these overlong questions right now.
4. **Invalid outputs accepted** -- the screenshot shows a 73-char "shortened" result that should have been rejected by validation.

### Fix

#### Step 1: Database cleanup

Clear `shorten_status` for all 99 unshortenable questions so they re-enter the shortening queue:

```sql
UPDATE questions
SET shorten_status = NULL
WHERE shorten_status = 'unshortenable'
  AND is_active = true;
```

For the 9 that are already ≤67 chars, also mark them as properly shortened:

```sql
UPDATE questions
SET shorten_status = 'shortened'
WHERE shorten_status IS NULL
  AND LENGTH(question_text) <= 67
  AND is_active = true
  AND original_question_text IS NOT NULL;
```

#### Step 2: Fix validation in `shorten-questions` edge function

The edge function must reject any AI output that is still over 67 characters. Add a strict post-processing check:

```text
if (shortenedText.length > 67) {
  // Mark as failed, don't apply
  status = 'unshortenable';
}
```

Currently the function may be accepting outputs without re-checking the final length after AI processing.

#### Step 3: Fix the "shortened but still long" display bug

The CombinedShortener UI shows questions with a green "shortened" badge even when the result exceeds 67 chars (like the 73-char example in the screenshot). Add a visual warning when a "shortened" result is still over the limit.

### Files to Modify

| File | Change |
|------|--------|
| Database | Reset 99 unshortenable records to NULL status |
| `supabase/functions/shorten-questions/index.ts` | Add strict length validation on AI output -- reject anything >67 chars |
| `src/components/admin/CombinedShortener.tsx` | Add warning indicator for shortened results that are still too long |

### Result

- 9 already-valid questions get proper "shortened" status immediately
- 90 too-long questions re-enter the queue for another shortening attempt with the improved prompt
- Future shortening runs won't accept invalid (>67 char) AI outputs
- UI clearly shows when a shortened result is still problematic

