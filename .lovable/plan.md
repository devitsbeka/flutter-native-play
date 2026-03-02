

## Fix: Server-Side Sort by Question/Answer Length

### Problem
The current approach fetches 50 questions sorted by `created_at DESC` from the database, then sorts those 50 by length on the client. This means you never actually see the globally longest questions -- you just see the 50 newest ones reshuffled. To see the longest questions across the entire database, the sorting must happen server-side before pagination.

### Solution
Create a new database function (RPC) that sorts by `length(question_text)` or answer length, with proper pagination and all existing filters.

### Changes

**1. Database migration: Create `get_questions_sorted_by_length` RPC**

```sql
CREATE OR REPLACE FUNCTION get_questions_sorted_by_length(
  p_sort_mode text DEFAULT 'longest_question',
  p_in_production boolean DEFAULT false,
  p_category_id uuid DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_question_type text DEFAULT NULL,
  p_difficulty text DEFAULT NULL,
  p_has_icon text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, category_id uuid, question_text text, correct_answer text,
  incorrect_answers jsonb, difficulty text, level_number int,
  is_active boolean, in_production boolean, icon_slug text,
  image_url text, video_url text, audio_url text,
  created_at timestamptz, updated_at timestamptz, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ ... $$;
```

- Applies all filters (category, language, type, difficulty, icon) server-side
- Sorts by `length(question_text) DESC` or max answer length DESC
- Returns `total_count` in each row for pagination
- Falls back to `created_at` for other sort modes

**2. Update `src/hooks/useQuestionStudio.ts`**

- For `longest_question` and `longest_answer` sort modes: call the new RPC instead of the standard query
- Extract `total_count` from the first result row
- Remove the client-side `.sort()` calls (no longer needed since the server handles it)
- Keep standard Supabase query for other sort modes (`newest`, `oldest`, `alphabetical`)

**3. No UI changes needed**

The filter dropdown already has "Longest questions" and "Longest answers" options. The default `sortBy` is already `'longest_question'`.

### Result
When you open Question Studio, you'll immediately see the globally longest questions first (e.g., 250 chars, 249 chars, 248 chars...) without needing to click anything. Same for "Longest answers" sort.

