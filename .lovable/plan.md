

## Fix: Shorten Questions/Answers in the Correct Language

### Problem
Both `shorten-questions` and `shorten-answers` edge functions have their AI prompts hardcoded entirely in Georgian. When English questions are processed, the AI translates them to Georgian instead of shortening them in English.

From the screenshot: "What was the costliest war in human history adjusted for inflation?" gets shortened to a Georgian sentence instead of a shorter English version.

### Root Cause
- `shorten-questions/index.ts` line 229: Prompt says "შენ ხარ ქართული ქვიზის კითხვების შემოკლების ექსპერტი" (You are a Georgian quiz shortening expert)
- `shorten-answers/index.ts` line 143: Same issue -- Georgian-only prompt
- Neither function queries the `language` column from the database
- The database has ~7,300 English questions and ~9,000 Georgian questions

### Solution
Make both functions language-aware:

1. **Add `language` to the SELECT query** in both functions so we know each question's language
2. **Create language-specific prompts** -- Georgian prompt for `ka` questions, English prompt for `en` (and other languages)
3. **Update the validation** in `shorten-questions` -- the `incompleteEndings` check (line 77) currently only has Georgian words; add English equivalents for non-Georgian questions

### Technical Details

**File: `supabase/functions/shorten-questions/index.ts`**

- Line 145: Add `language` to the SELECT: `"id, question_text, correct_answer, incorrect_answers, category_id, language"`
- Lines 76-85: Make `incompleteEndings` validation language-aware (Georgian endings for `ka`, English endings like "and", "but", "or", "the", "a" for `en`)
- Lines 229-260: Replace the single Georgian prompt with a function that returns the appropriate prompt based on `question.language`:
  - For `ka`: Keep existing Georgian prompt
  - For `en`/other: English prompt with equivalent rules (e.g., "You are a quiz question shortening expert. Shorten this question to max 65 characters while preserving meaning...")

**File: `supabase/functions/shorten-answers/index.ts`**

- Line 51: Add `language` to the SELECT: `"id, question_text, correct_answer, incorrect_answers, category_id, language"`
- Lines 143-174: Replace the single Georgian prompt with a language-aware function:
  - For `ka`: Keep existing Georgian prompt
  - For `en`/other: English prompt with equivalent rules about not truncating proper nouns, using shorter synonyms, etc.

### Key Design Decisions
- Default to English prompt if `language` is null or unrecognized (safer than defaulting to Georgian for non-Georgian content)
- Keep the exact same validation logic and thresholds -- only the AI prompt language changes
- Georgian-specific validation rules (incomplete endings) are skipped for non-Georgian questions, replaced with English equivalents

