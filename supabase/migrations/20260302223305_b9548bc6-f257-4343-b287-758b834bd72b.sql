
CREATE OR REPLACE FUNCTION public.get_questions_sorted_by_length(
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
  id uuid,
  category_id uuid,
  question_text text,
  correct_answer text,
  incorrect_answers jsonb,
  difficulty text,
  level_number int,
  is_active boolean,
  in_production boolean,
  icon_slug text,
  image_url text,
  video_url text,
  audio_url text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_ans_len int;
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
  WHERE q.in_production = p_in_production
    AND (p_category_id IS NULL OR q.category_id = p_category_id)
    AND (p_language IS NULL OR q.language = p_language)
    AND (p_difficulty IS NULL OR q.difficulty = p_difficulty)
    AND (p_has_icon IS NULL 
         OR (p_has_icon = 'with' AND q.icon_slug IS NOT NULL)
         OR (p_has_icon = 'without' AND q.icon_slug IS NULL))
    AND (p_question_type IS NULL
         OR (p_question_type = 'video' AND q.video_url IS NOT NULL)
         OR (p_question_type = 'audio' AND q.audio_url IS NOT NULL AND q.video_url IS NULL)
         OR (p_question_type = 'image' AND q.image_url IS NOT NULL AND q.video_url IS NULL AND q.audio_url IS NULL)
         OR (p_question_type = 'text' AND q.image_url IS NULL AND q.video_url IS NULL AND q.audio_url IS NULL))
  ORDER BY
    CASE WHEN p_sort_mode = 'longest_question' THEN length(q.question_text) END DESC NULLS LAST,
    CASE WHEN p_sort_mode = 'longest_answer' THEN GREATEST(
      length(q.correct_answer),
      (SELECT MAX(length(ans::text)) FROM jsonb_array_elements_text(q.incorrect_answers) ans)
    ) END DESC NULLS LAST,
    q.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
