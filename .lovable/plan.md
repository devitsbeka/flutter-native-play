

## The Problem

When you delete or edit questions in a category and then try to play it, you see the "უპს!" error screen saying no questions are available.

## Root Cause

The question fetching system has a mismatch between how it counts "available" questions and what it actually serves:

- **Total count**: Counts ALL active questions in the category (e.g., 150)
- **Actually playable**: Only questions with text under 70 characters AND answers under 20 characters are served (e.g., only 100 of 150)
- **Seen tracker**: Records IDs of played (valid) questions

What happens:
1. You play through all ~100 valid questions over multiple sessions
2. The tracker has 100 IDs marked as "seen"
3. The system checks: "Are 100 seen >= 150 total?" -- No, so it thinks there are still questions left
4. It queries DB excluding the 100 seen IDs, gets back 50 "invalid" questions (text too long)
5. The length validation filter removes all 50 -- result: 0 playable questions
6. You see the error screen

Deleting/editing questions makes this worse because it changes the total count and can trigger this state sooner.

## The Fix

### 1. Count only valid questions for exhaustion detection
Instead of counting ALL questions, count only those that pass the length validation (question text <= 70 chars, answers <= 20 chars, at least 3 incorrect answers). This way the tracker accurately knows when the valid pool is exhausted.

### 2. Filter invalid questions at the database level
Add length constraints directly to the SQL queries so invalid questions are never fetched in the first place, reducing unnecessary data transfer and making counts accurate.

---

## Technical Details

**File: `src/services/questionService.ts`**

In `getCategoryQuestions()`:
- Change the `totalAvailable` count query (line ~289) to include length filters: `.lte('question_text', 70 chars)` -- Since Supabase doesn't support `length()` in queries, we'll fetch IDs only and filter client-side, then use the filtered count for exhaustion detection
- Alternative: add a helper that counts valid questions by fetching minimal data and filtering
- After Fallback 2 (line ~363), apply `isValidQuestionLength` BEFORE the empty check, not after
- Move the `validQuestions` filter (line ~393) before the "return empty" check (line ~375) so the system can detect when all remaining questions are invalid and reset the tracker

**Key change in the flow:**
```
Current:  fetch → check if 0 → filter invalid → return (could be 0!)
Fixed:    fetch → filter invalid → check if 0 → if 0, clear tracker and retry → return
```

This ensures the exhaustion reset happens when valid questions run out, not just when all questions run out.
