REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  nickname,
  avatar_url,
  animated_avatar_url,
  country_code,
  region,
  preferred_language,
  age_group,
  has_face_photo,
  total_points,
  total_correct_answers,
  games_played,
  games_won,
  current_streak,
  best_streak,
  coins,
  gems,
  last_play_regen_at,
  referral_code,
  referred_by_invite_id,
  created_at,
  updated_at
) ON public.profiles TO anon, authenticated;