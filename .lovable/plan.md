

# Smart Answer Shortening for English Questions

## Problem

Your English question pool has a serious quality issue:
- **3,388 answers** exceed the 20-character limit (many are full sentences like "Statistical literacy reduces catastrophic thinking")
- **1,189 answers** are within limits but unnecessarily verbose
- Average answer length is 21.2 characters (should ideally be ~10-14)
- Many answers read like explanations, not quiz options

## Recommended Approach: Enhanced Contextual AI Shortening

The existing `shorten-answers` edge function already handles the mechanics well (language-aware prompts, pending review system, batch processing). The best approach is to **enhance it** rather than build something new.

### What Changes

**1. Update the `shorten-answers` edge function**
- Add a new `aggressiveMode` parameter that targets answers between 13-20 chars too (not just >20)
- Improve the English prompt to be more aggressive about shortening while preserving factual accuracy
- Add examples of good shortenings in the prompt (e.g., "The United Kingdom" to "United Kingdom", "Consumer Price Index" to "CPI", "Mathematical concept" to "A concept")
- For answers that are full sentences (>30 chars), instruct AI to extract just the key term or reject the question entirely
- Add a `flagForReview` status for answers that are sentences masquerading as quiz answers (these need the question itself rewritten, not just the answer shortened)

**2. Add a "flag bad questions" path**
- Answers >30 characters that are full sentences (contain verbs, multiple clauses) likely indicate the question itself is poorly constructed
- These should be flagged as `needs_rewrite` rather than just shortened
- The existing `answer_shorten_status` column can handle new statuses

**3. Update the `CombinedShortener` admin UI**
- Add a language filter (so you can target English specifically)
- Add an "Aggressive mode" toggle for the 13-20 char range
- Show flagged questions separately for manual review
- Add a "Run on English only" quick action

### Processing Strategy

Run in two passes:
1. **Pass 1 - Obvious fixes** (answers >20 chars): Use the enhanced prompt to shorten or flag ~3,388 questions
2. **Pass 2 - Optimization** (answers 13-20 chars): Use gentler shortening on ~1,189 borderline answers

Both passes use the existing pending review system so nothing goes live without admin approval.

---

## Technical Details

### Edge Function Changes (`supabase/functions/shorten-answers/index.ts`)

- Add `aggressiveMode` and `language` parameters to the request body
- When `aggressiveMode` is true, lower the threshold from >20 to >12 chars
- Add sentence detection: if answer contains spaces and >30 chars, flag as `needs_rewrite`
- Enhanced English prompt with better shortening examples and stricter rules about what constitutes a valid quiz answer
- Add `language` filter to the query (`query.eq("language", language)`)

### Admin UI Changes (`src/components/admin/CombinedShortener.tsx`)

- Add language selector dropdown (English, Georgian, etc.)
- Add aggressive mode toggle
- Show count of questions needing rewrite vs. just shortening
- Display `needs_rewrite` flagged questions in a separate section

### Database

- No schema changes needed -- the existing `answer_shorten_status` column supports new status values like `needs_rewrite`

