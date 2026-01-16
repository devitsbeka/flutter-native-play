-- Drop existing function and recreate with new return type
DROP FUNCTION IF EXISTS public.get_category_question_counts();

CREATE FUNCTION public.get_category_question_counts()
RETURNS TABLE(category_id uuid, question_count bigint, production_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    category_id,
    COUNT(*) as question_count,
    COUNT(*) FILTER (WHERE in_production = true) as production_count
  FROM questions
  WHERE is_active = true
  GROUP BY category_id;
$$;