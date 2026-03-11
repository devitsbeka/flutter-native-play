

## Fix: Auto-detect language when manually adding questions

### Problem
Manual question creation in Question Studio always defaults to `language: 'ka'` (database default), so English questions get mixed into the Georgian pool.

### Solution
Add automatic language detection when inserting questions — detect whether the text is Georgian or English/Latin and set the `language` field accordingly.

### Changes

**1. Create a shared language detection utility** (`src/utils/languageDetection.ts`)
- Reuse the `isGeorgian(text)` pattern already used in edge functions
- Export a `detectQuestionLanguage(questionText, correctAnswer)` function that returns `'ka'` if Georgian characters are dominant, otherwise `'en'`

**2. Update `useQuestionStudio.ts` → `addQuestion`** (line ~621)
- Import `detectQuestionLanguage`
- Auto-detect language from `question_text` and `correct_answer`
- Include `language` in the insert payload

**3. Update `useQuestionStudio.ts` → `bulkAddQuestions`** (line ~662)
- Same auto-detection for each question in the batch

**4. Update `useAdminQuestions.ts` → `addQuestion` and `bulkAddQuestions`**
- Same pattern for the import tools that use this hook

**5. Update `CreateQuestionModal`** (optional enhancement)
- Show a small badge/indicator showing the detected language so the admin knows what will be saved
- Optionally allow manual override via a language selector dropdown

### Detection Logic
```text
detectQuestionLanguage(questionText, correctAnswer):
  1. Count Georgian Unicode chars (U+10A0–U+10FF) in questionText
  2. If Georgian chars > 30% of alphabetic chars → return 'ka'
  3. Otherwise → return 'en'
```

This matches the exact logic used in `fix-mixed-language-questions` and `restore-english-questions` edge functions, ensuring consistency.

### Impact
- All manually created questions will be correctly tagged
- English questions in მსოფლიო ისტორია will go to the English pool
- Georgian questions remain in the Georgian pool
- No change to the Flow page (already handles language correctly)

