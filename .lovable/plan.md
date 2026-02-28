

## Fix Language-Aware Quality Review and Resolve + Undo Translated Questions

### Problem Summary

1. **96 English questions in Anime/Manga category got translated to Georgian** by the resolve function, which is hardcoded to treat everything as Georgian.
2. Both `review-question-quality` and `resolve-question-quality` edge functions have hardcoded "Georgian language" in their AI prompts, so they evaluate and fix questions as Georgian regardless of the actual `language` column.

### Plan

#### Part 1: Undo the damage -- Restore translated English questions

The 96 recently-resolved English questions (updated after 2026-02-28 21:00:00) in the anime/manga category need to be reset so they can be re-resolved properly once the fix is in place.

- Clear `ai_review_score`, `ai_review_grade`, `ai_review_data`, and `last_ai_review` for these 96 questions
- Unfortunately, the original English text was overwritten in the database by the resolve function -- the originals are lost
- **These questions will need to be re-imported or manually fixed** since their text is now Georgian

I'll flag them by setting `in_production = false` and `quality_status = 'needs_rewrite'` so they're pulled from production and easily identifiable for re-import.

#### Part 2: Make `review-question-quality` language-aware

**File:** `supabase/functions/review-question-quality/index.ts`

- Add `language` field to the `Question` interface
- Include `language` in the SELECT query (line 186)
- Add a language name map: `{ ka: 'Georgian', en: 'English', fr: 'French', ... }`
- Pass `language` to `reviewQuestion()` function
- Replace hardcoded "Georgian language trivia evaluator" with the question's actual language name
- Replace "Georgian spelling, verb conjugation..." with language-appropriate grammar description

#### Part 3: Make `resolve-question-quality` language-aware

**File:** `supabase/functions/resolve-question-quality/index.ts`

- Read `question.language` from the fetched question (already doing `select('*')`)
- Use the same language name map
- Replace all hardcoded "Georgian" references in the fix prompt:
  - "Georgian language trivia question expert" --> "[Language] language trivia question expert"
  - "All text must be in Georgian language" --> "All text must be in [Language] language"
  - "Fixed question in Georgian" --> "Fixed question in [Language]"
  - "case endings in Georgian" --> grammar rules appropriate for the language
- Same changes for the re-review prompt

#### Part 4: Make `fix-generated-question` consistent

**File:** `supabase/functions/fix-generated-question/index.ts`

- This function already accepts a `language` parameter and handles it correctly -- no changes needed here.

### Language Name Map (shared constant in both functions)

```text
const LANGUAGE_NAMES: Record<string, string> = {
  'ka': 'Georgian',
  'en': 'English',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'it': 'Italian',
  'pt': 'Portuguese',
  'pt-br': 'Brazilian Portuguese',
};
```

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/review-question-quality/index.ts` | Add language to query/interface, make prompts language-aware |
| `supabase/functions/resolve-question-quality/index.ts` | Read question.language, make all prompts language-aware |
| Database | Mark 96 corrupted questions as needs_rewrite + out of production |

### No Client-Side Changes Needed

The hook fetches questions by ID, and both edge functions fetch full question data from the DB -- the `language` column is already available without any client changes.

