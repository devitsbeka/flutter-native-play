-- Create function to get accurate question counts per category
CREATE OR REPLACE FUNCTION get_category_question_counts()
RETURNS TABLE(category_id uuid, question_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    category_id,
    COUNT(*) as question_count
  FROM questions
  WHERE is_active = true
  GROUP BY category_id;
$$;