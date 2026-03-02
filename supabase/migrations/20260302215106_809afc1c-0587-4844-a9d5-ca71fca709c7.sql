
CREATE OR REPLACE FUNCTION public.get_overlong_questions(
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
  SELECT *
  FROM questions
  WHERE in_production = p_in_production
    AND (p_category_id IS NULL OR category_id = p_category_id)
    AND (p_language IS NULL OR language = p_language)
  ORDER BY
    CASE WHEN length(question_text) > 67
      OR length(correct_answer) > 25
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(incorrect_answers) AS a
        WHERE length(a) > 25
      )
    THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
