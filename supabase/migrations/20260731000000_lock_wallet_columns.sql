-- Stop handing out every player's gem balance and referral code.
--
-- WHAT IS ACTUALLY EXPOSED TODAY. The anon key ships inside the client
-- bundle, so "anon can read it" means "anyone can read it". Against
-- production, unauthenticated:
--
--   GET /rest/v1/profiles?select=referral_code&referral_code=not.is.null
--   -> 161 rows. Every live referral code in the product.
--
--   GET /rest/v1/profiles?select=nickname,coins,gems
--   -> 647 rows. Every wallet.
--
-- Referral codes are the sharp one: a code is the token that attributes a
-- signup to someone, so a dump of all of them is a farming kit.
--
-- COINS ARE DELIBERATELY LEFT ALONE. The league leaderboard renders other
-- players' coins (LeaguePlayerRow: `entry.coins || entry.weekly_xp`) and
-- promotes tiers off them. Coins are a public score in this product, not a
-- secret, so revoking them would break a shipped feature to hide something
-- already on screen by design. Gems are different - grep finds no place
-- where another player's gems are ever rendered.
--
-- WHY THE GRANT IS REWRITTEN WHOLESALE. A column-level REVOKE is a silent
-- no-op while a table-level SELECT grant is still in place, and it is not
-- obvious from the outside which of the two a given role holds. So both
-- forms are revoked and the allowed columns are re-granted explicitly. The
-- list below is the previous list (from the security_question_id lockdown,
-- plus the free-play window columns) minus gems and referral_code.

REVOKE SELECT ON public.profiles FROM anon, authenticated;
REVOKE SELECT (gems, referral_code) ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, user_id, nickname, avatar_url, animated_avatar_url,
  country_code, region, preferred_language, age_group, has_face_photo,
  total_points, total_correct_answers, games_played, games_won,
  current_streak, best_streak, coins,
  last_play_regen_at, referred_by_invite_id,
  free_plays_used, free_plays_window_start,
  created_at, updated_at
) ON public.profiles TO anon, authenticated;


-- The owner's own private fields. UPDATE still works without SELECT, so
-- nothing about writing gems or codes changes - this is only about reading.
CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
           'gems', COALESCE(p.gems, 0),
           'referral_code', p.referral_code)
  FROM profiles p
  WHERE p.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;


-- Signup needs to turn a referral code into the inviter. It returns the
-- inviter's user_id and nickname and NOTHING else, so a caller who already
-- holds a code learns only who it belongs to - which they were told anyway,
-- since someone handed them the link. What it no longer allows is listing
-- every code in the table.
--
-- Deliberately callable by anon: the lookup happens during signup, before
-- the new session exists.
-- Returns jsonb rather than a typed row so the signature cannot drift out of
-- step with the column types in the table.
CREATE OR REPLACE FUNCTION public.resolve_referral_code(p_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('user_id', p.user_id, 'nickname', p.nickname)
  FROM profiles p
  WHERE p.referral_code = NULLIF(btrim(p_code), '')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_referral_code(text) TO anon, authenticated;


-- The admin dashboards read balances across all users. They run as the
-- ordinary `authenticated` role, so the revoke above would have broken them
-- silently - hence an explicitly admin-gated route to the same data.
CREATE OR REPLACE FUNCTION public.admin_user_economy()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', p.user_id, 'nickname', p.nickname,
           'avatar_url', p.avatar_url, 'country_code', p.country_code,
           'games_played', p.games_played, 'games_won', p.games_won,
           'total_points', p.total_points, 'coins', p.coins, 'gems', p.gems,
           'has_referral_code', p.referral_code IS NOT NULL,
           'created_at', p.created_at)), '[]'::jsonb)
    INTO v_rows
  FROM profiles p;

  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_economy() TO authenticated;
