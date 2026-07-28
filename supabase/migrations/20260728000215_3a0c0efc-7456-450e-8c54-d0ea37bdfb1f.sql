REVOKE SELECT (security_answer_hash) ON public.profiles FROM anon;
REVOKE SELECT (security_answer_hash) ON public.profiles FROM authenticated;

GRANT INSERT (security_answer_hash) ON public.profiles TO authenticated;
GRANT UPDATE (security_answer_hash) ON public.profiles TO authenticated;