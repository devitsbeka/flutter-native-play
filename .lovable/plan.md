

## Add Language Filter to Question Studio

### Problem
Question Studio currently shows all questions regardless of language. Georgian and English questions are mixed together in the list, making it hard to manage English-only content.

### Changes

#### 1. Update `StudioFilters` type and add language state
**File:** `src/hooks/useQuestionStudio.ts`

- Add `language` state (default: `'all'`, options: `'all'`, `'en'`, `'ka'`)
- Apply `.eq('language', language)` filter to:
  - The category counts query (`fetchCategories`) so counts reflect the selected language
  - The count query in `fetchQuestions`
  - The data query in `fetchQuestions`
  - The RPC search path (client-side filter on `language` field since the RPC may not support it)
- Expose `language` and `setLanguage` from the hook return
- Add `language` to the `useEffect` dependencies that reset page/selection and trigger refetches

#### 2. Add language filter dropdown to the QuestionFilters component
**File:** `src/components/admin/studio/QuestionFilters.tsx`

- Add a new "Language" section to the existing filter dropdown with radio options: All, English, Georgian
- Accept `language` and `onLanguageChange` props
- Include language in the active filter count badge

#### 3. Wire it up in QuestionStudio page
**File:** `src/pages/admin/QuestionStudio.tsx`

- No changes needed here since `QuestionList` already passes `filters` and `onFiltersChange` down to `QuestionFilters`

### Alternative: Standalone dropdown vs inside filter menu

Since the screenshot shows the filter button already exists in the question list header, the cleanest approach is to add a dedicated language dropdown **next to** the filter button (not inside it) for quick access, similar to how it was done in Quality Review. This makes language switching a one-click action.

**Revised approach -- add standalone language selector in `QuestionList.tsx`:**
- Add a small `<Select>` or segmented button (EN / KA / All) next to the filter button in the question list header
- Pass `language` and `onLanguageChange` from the hook through props

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useQuestionStudio.ts` | Add `language` state, filter all queries by language, expose in return |
| `src/components/admin/studio/QuestionList.tsx` | Add language selector dropdown next to the filter button |
| `src/pages/admin/QuestionStudio.tsx` | Pass language props from hook to QuestionList |

### How It Works

1. Admin selects "EN" from the language dropdown in the question list header
2. Category sidebar counts update to show only English question counts
3. Question list shows only English questions
4. Library/Production tab counts reflect English-only totals
5. Switching back to "All" restores the full view

