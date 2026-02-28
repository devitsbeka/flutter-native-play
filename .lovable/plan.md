

## Add Language Filter to Quality Review

### Problem
The Quality Review page (`/admin/review`) has no language filter. When you run a review, it fetches questions in all languages. The edge functions are now language-aware for prompts, but the client-side query doesn't filter by language -- so you can't review only English questions.

### Changes

#### 1. Add language filter to the Quality Review UI
**File:** `src/pages/admin/QualityReview.tsx`

- Add a `languageFilter` state (default: `'all'`)
- Add a Language dropdown in the filters section (next to Category, Status, etc.) with options: All, English, Georgian
- Pass `languageFilter` to both `startReview()` and `loadSavedIssues()` calls

#### 2. Update the hook to accept and use language filter
**File:** `src/hooks/useQuestionQualityReview.ts`

- Add `language?: string` to `ReviewOptions` interface
- In `startReview()`: add `.eq('language', options.language)` to both the count query and the fetch query when language is specified
- In `loadSavedIssues()`: add `.eq('language', options.language)` to the query when language is specified

#### 3. No edge function changes needed
The edge functions already read `language` from the database and use language-aware prompts (fixed in the previous update). The filtering just needs to happen at the query level so only English questions are sent for review.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/QualityReview.tsx` | Add language dropdown filter UI |
| `src/hooks/useQuestionQualityReview.ts` | Add `language` to `ReviewOptions` and filter queries |

