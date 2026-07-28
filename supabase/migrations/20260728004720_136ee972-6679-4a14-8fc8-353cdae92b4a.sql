REVOKE UPDATE ON public.tv_players FROM anon;
REVOKE UPDATE ON public.tv_players FROM authenticated;

GRANT UPDATE (nickname, avatar_url, is_active, user_id)
  ON public.tv_players TO anon, authenticated;