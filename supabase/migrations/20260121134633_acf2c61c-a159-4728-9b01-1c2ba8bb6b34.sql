
-- Fix the remaining user_presence policy that wasn't created
DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;

CREATE POLICY "Users can update own presence" 
ON public.user_presence FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recreate the functions with search_path (these may have failed due to the policy error)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_league_leaderboard(p_tier integer, p_region text DEFAULT NULL::text, p_limit integer DEFAULT 50)
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
  ORDER BY p.coins DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.increment_quiz_plays(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_quiz_posts
  SET plays_count = plays_count + 1
  WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_category_total_levels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_category_id uuid;
  old_total_levels integer;
  new_total_levels integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_category_id := OLD.category_id;
  ELSE
    affected_category_id := NEW.category_id;
  END IF;
  
  SELECT total_levels INTO old_total_levels FROM categories WHERE id = affected_category_id;
  
  SELECT GREATEST(1, FLOOR(COUNT(*)::decimal / 10)::integer) INTO new_total_levels
  FROM questions q
  WHERE q.category_id = affected_category_id 
    AND q.is_active = true 
    AND q.in_production = true;
  
  UPDATE categories
  SET total_levels = new_total_levels,
      levels_updated_at = CASE 
        WHEN new_total_levels > COALESCE(old_total_levels, 0) THEN now()
        ELSE levels_updated_at
      END
  WHERE id = affected_category_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_economy_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
