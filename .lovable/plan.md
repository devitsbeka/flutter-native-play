

## Show Overlong Questions First in Question Studio

### Goal
Add a filter option in Question Studio that surfaces questions exceeding character limits (question text > 67 chars OR any answer > 25 chars) so admins can find and fix them without leaving the studio.

### Approach

**1. Create a database function (RPC) to find overlong questions**

Create an RPC `get_overlong_questions` that returns question IDs where:
- `length(question_text) > 67`, OR
- `length(correct_answer) > 25`, OR
- any element in `incorrect_answers` array has length > 25

This is necessary because Supabase client queries can't filter by string length or iterate JSONB array element lengths.

Parameters: `p_category_id` (optional), `p_in_production` (boolean), `p_language` (optional), `p_limit`, `p_offset`

Returns full question rows ordered with overlong questions first, then the rest by `created_at DESC`.

**2. Add "Overlong" sort option to `StudioFilters`**

In `src/hooks/useQuestionStudio.ts`:
- Extend the `sortBy` type from `'newest' | 'oldest' | 'alphabetical'` to include `'overlong_first'`

In `src/components/admin/studio/QuestionFilters.tsx`:
- Add a new radio item "გრძელი პირველი" (Overlong first) under the sort section

**3. Use the RPC when `sortBy === 'overlong_first'`**

In `useQuestionStudio.ts` `fetchQuestions`:
- When `sortBy` is `'overlong_first'` and there's no search query, call the new RPC instead of the standard Supabase query
- The RPC handles pagination, category, language, and production status filters server-side
- Apply remaining client-side filters (type, difficulty, hasIcon) after the RPC call

### Technical Details

**Database function SQL:**
```sql
CREATE OR REPLACE FUNCTION get_overlong_questions(
  p_category_id uuid DEFAULT NULL,
  p_in_production boolean DEFAULT false,
  p_language text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS SETOF questions
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM questions
  WHERE in_production = p_in_production
    AND (p_category_id IS NULL OR category_id = p_category_id)
    AND (p_language IS NULL OR language = p_language)
  ORDER BY
    CASE WHEN length(question_text) > 67
      OR length(correct_answer) > 25
      OR EXISTS (
        SELECT 1 FROM unnest(incorrect_answers) AS a(val)
        WHERE length(a.val) > 25
      )
    THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
```

**Files to modify:**
- `src/hooks/useQuestionStudio.ts` -- extend `sortBy` type, add RPC call branch
- `src/components/admin/studio/QuestionFilters.tsx` -- add "გრძელი პირველი" sort option

**Visual indicator:** In `QuestionList.tsx`, add a small warning badge (e.g., red dot or `AlertTriangle` icon) next to questions that exceed limits, so they're visually distinct even when scrolling.

