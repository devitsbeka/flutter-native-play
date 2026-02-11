
# Integrate Quality Review into Generation Flow

## Summary
After questions are generated on /admin/flow, we'll automatically run them through the same AI quality review used on /admin/review. Each question card will display a quality score (0-100%) with color coding, and questions scoring below 90% will show a "Fix it" button that uses the `resolve-question-quality` edge function to improve them.

## How It Works

1. **Post-Generation Quality Check**: After questions are generated and duplicates are checked, a new step calls the `review-question-quality` edge function to score each question (grammar, uniqueness, clarity).

2. **Quality Score Display**: Each question card in the list shows a colored quality badge:
   - 90-100%: Green (A grade) -- no action needed
   - 75-89%: Yellow (B grade) -- "Fix it" button shown
   - 50-74%: Orange (C grade) -- "Fix it" button shown
   - 0-49%: Red (D grade) -- "Fix it" button shown

3. **Fix It Button**: Clicking "Fix it" on a question calls the `resolve-question-quality` edge function with the review data (grammar_issues, uniqueness_issues, etc.), which rewrites the question and re-scores it. The question card updates in-place.

## Technical Details

### 1. Extend `GeneratedQuestion` interface (src/pages/admin/Flow.tsx)

Add quality review fields to the interface:
```
qualityScore?: number;        // 0-100
qualityGrade?: 'A'|'B'|'C'|'D';
qualityData?: {
  grammar_score: number;
  grammar_issues: string[];
  uniqueness_score: number;
  uniqueness_issues: string[];
  confusion_score: number;
  confusion_issues: string[];
  recommendations: string[];
};
isReviewingQuality?: boolean; // loading state for individual fix
```

### 2. Add quality review step to generation flow (src/pages/admin/Flow.tsx)

After `handleQuestionsGenerated` adds questions to state, a new `reviewQuestionQuality` function will:
- Take the generated questions (not yet saved to DB, so we can't use question IDs)
- Call the `review-question-quality` edge function directly with the question data
- Update each question in state with its quality score

Since the questions aren't in the DB yet, we'll need to modify the approach slightly: instead of calling the existing edge function (which queries the DB), we'll create a lightweight variant that accepts question data directly. However, to avoid creating a new edge function, we can reuse the existing `review-question-quality` by first inserting questions temporarily OR by calling the AI quality check inline from the client side via a new edge function.

**Best approach**: Create a new edge function `review-generated-questions` that accepts raw question data (not DB IDs) and returns quality scores. This reuses the same AI prompt from `review-question-quality`.

### 3. New edge function: `supabase/functions/review-generated-questions/index.ts`

Accepts an array of questions (with text, answers) and returns quality scores for each. Uses the same evaluation prompt and scoring as `review-question-quality` but doesn't need DB access. Processes in batches of 5.

### 4. Add "Fix it" handler (src/pages/admin/Flow.tsx)

A new `handleFixQuestion` function that:
- Takes a question ID and its quality data
- Calls `resolve-question-quality`-style logic (but for unsaved questions -- new edge function `fix-generated-question`)
- Updates the question in local state with improved text and new score

**New edge function**: `supabase/functions/fix-generated-question/index.ts` -- accepts raw question data + review issues, returns fixed question + new score. Same logic as `resolve-question-quality` but works on raw data instead of DB records.

### 5. Update QuestionPreviewList and QuestionCard (src/components/admin/flow/QuestionPreviewList.tsx)

- Add quality score badge next to each question (colored circle with %)
- Show "Fix it" button for scores below 90%
- Show spinner while fixing
- Pass `onFixQuestion` callback down from Flow

### 6. Update `supabase/config.toml`

Register the two new edge functions with `verify_jwt = false`.

## File Changes Summary

| File | Change |
|---|---|
| `src/pages/admin/Flow.tsx` | Extend GeneratedQuestion interface, add quality review after generation, add fixQuestion handler |
| `src/components/admin/flow/QuestionPreviewList.tsx` | Show quality score badge, "Fix it" button on each card |
| `supabase/functions/review-generated-questions/index.ts` | New -- reviews raw question data without DB |
| `supabase/functions/fix-generated-question/index.ts` | New -- fixes a question and re-scores it |
| `supabase/config.toml` | Register new functions |

## UX Flow

1. User selects category, clicks "Generate 50"
2. Questions appear with "Reviewing quality..." indicator
3. Quality scores populate on each card (e.g., "87%", "95%", "62%")
4. Questions below 90% show an orange/red "Fix it" button
5. User clicks "Fix it" on a bad question -- spinner shows, AI fixes it, new score appears
6. User can then approve/reject as normal
