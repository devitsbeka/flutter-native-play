
DROP FUNCTION IF EXISTS public.get_league_leaderboard(integer, text, integer);

CREATE FUNCTION public.get_league_leaderboard(p_tier integer, p_region text DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, nickname text, avatar_url text, coins integer, weekly_xp integer, previous_rank integer, current_rank integer, country_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ld.user_id,
    p.nickname,
    p.avatar_url,
    p.coins,
    ld.weekly_xp,
    ld.previous_rank,
    ld.current_rank,
    p.country_code
  FROM user_league_data ld
  JOIN profiles p ON p.user_id = ld.user_id
  WHERE ld.league_tier = p_tier
    AND (p_region IS NULL OR p_region = 'global' OR p.region = p_region)
    AND p.nickname != '[წაშლილი]'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = ld.user_id AND ur.role = 'admin'
    )
  ORDER BY p.coins DESC
  LIMIT p_limit;
$$;
