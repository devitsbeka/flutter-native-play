

## Fix: Answer-based Search Not Working in Content Manager

### Root Cause
The `incorrect_answers::text` type casting syntax works in raw SQL but **does not work** in Supabase PostgREST's `.or()` filter. PostgREST silently ignores or fails the cast, so searching by incorrect answers never matches anything. This affects both the Content Manager (`useAdminQuestions.ts`) and the Question Studio (`useQuestionStudio.ts`).

### Solution
Create a database function (RPC) that performs the search in raw SQL where `::text` casting works properly, then call it from both hooks instead of using `.or()` filters.

### Step 1: Create a database function

A new SQL function `search_questions` that accepts a search term, optional category ID, pagination params, and returns matching questions plus a total count.

```sql
CREATE OR REPLACE FUNCTION search_questions(
  p_search text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid, category_id uuid, question_text text, correct_answer text,
  incorrect_answers jsonb, difficulty text, level_number int,
  is_active boolean, in_production boolean, icon_slug text,
  image_url text, video_url text, audio_url text,
  created_at timestamptz, updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id, q.category_id, q.question_text, q.correct_answer,
    q.incorrect_answers, q.difficulty, q.level_number,
    q.is_active, q.in_production, q.icon_slug,
    q.image_url, q.video_url, q.audio_url,
    q.created_at, q.updated_at,
    COUNT(*) OVER() AS total_count
  FROM questions q
  WHERE
    (p_category_id IS NULL OR q.category_id = p_category_id)
    AND (
      p_search IS NULL
      OR q.question_text ILIKE '%' || p_search || '%'
      OR q.correct_answer ILIKE '%' || p_search || '%'
      OR q.incorrect_answers::text ILIKE '%' || p_search || '%'
    )
  ORDER BY q.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
```

### Step 2: Update `useAdminQuestions.ts`

Replace the two separate queries (count + data) with a single `supabase.rpc('search_questions', {...})` call when a search term is present. When there's no search, keep the existing `.from('questions')` query for efficiency.

### Step 3: Update `useQuestionStudio.ts`

Apply the same RPC-based search approach for consistency -- use `search_questions` when a search term is active.

### Why This Works
- Raw SQL inside a database function supports `::text` casting on JSONB columns
- Single query instead of two (count + data) since `COUNT(*) OVER()` provides both
- No change to the UI -- search input and behavior remain identical

