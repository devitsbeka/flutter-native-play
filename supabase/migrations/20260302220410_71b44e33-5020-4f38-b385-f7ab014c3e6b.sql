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