
-- Drop both overloaded versions of get_overlong_questions
DROP FUNCTION IF EXISTS public.get_overlong_questions(uuid, boolean, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_overlong_questions(uuid, boolean, text, integer, integer, text);
