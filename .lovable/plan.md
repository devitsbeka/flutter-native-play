

## Sort Questions by Actual Character Length (Longest First)

### Problem
The current `get_overlong_questions` RPC groups questions into two buckets (overlong vs. not overlong) but doesn't rank within those groups by actual length. A 250-char question and a 68-char question appear in the same bucket with no ordering between them.

### Solution
Update the database function to sort by actual content length descending: first by question text length, then by the longest answer length.

### Changes

**1. Update the `get_overlong_questions` database function**

Replace the binary CASE sorting with continuous length-based sorting:

```sql
CREATE OR REPLACE FUNCTION get_overlong_questions(
  p_category_id uuid DEFAULT NULL,
  p_in_production boolean DEFAULT false,
  p_language text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS SETOF questions
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT q.*
  FROM questions q
  LEFT JOIN LATERAL (
    SELECT MAX(length(a)) AS max_ans_len
    FROM jsonb_array_elements_text(q.incorrect_answers) AS a
  ) ans ON true
  WHERE q.in_production = p_in_production
    AND (p_category_id IS NULL OR q.category_id = p_category_id)
    AND (p_language IS NULL OR q.language = p_language)
  ORDER BY
    GREATEST(
      length(q.question_text),
      length(q.correct_answer) * 3,
      COALESCE(ans.max_ans_len, 0) * 3
    ) DESC,
    length(q.question_text) DESC,
    GREATEST(length(q.correct_answer), COALESCE(ans.max_ans_len, 0)) DESC,
    q.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
```

The sorting logic:
- Primary: `GREATEST(question_length, answer_length * 3)` -- this ensures questions with very long text come first, but also surfaces answers that are disproportionately long (multiplied by 3 since answer limit is ~3x smaller than question limit)
- Secondary: `length(question_text) DESC` -- among same "worst score", longest question wins
- Tertiary: longest answer DESC
- Fallback: newest first

**2. No frontend changes needed**

The hook already calls this RPC as the default sort and displays the `AlertTriangle` icon for overlong items. The only change is the database function itself -- questions will now appear in true descending length order.

### Files
- **Database migration**: Update `get_overlong_questions` function

