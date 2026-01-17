-- Create optimized leaderboard function that combines user_league_data and profiles in one query
CREATE OR REPLACE FUNCTION get_league_leaderboard(
  p_tier integer,
  p_region text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  nickname text,
  avatar_url text,
  coins integer,
  weekly_xp integer,
  previous_rank integer,
  current_rank integer,
  country_code text
) AS $$
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
  ORDER BY p.coins DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- Add indexes for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_league_data_tier_xp 
  ON user_league_data(league_tier, weekly_xp DESC);
  
CREATE INDEX IF NOT EXISTS idx_profiles_region_coins 
  ON profiles(region, coins DESC);

CREATE INDEX IF NOT EXISTS idx_user_league_data_user_id 
  ON user_league_data(user_id);