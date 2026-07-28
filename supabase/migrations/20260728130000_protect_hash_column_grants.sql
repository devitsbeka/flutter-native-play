-- Tier 0 · S-1 (corrected): actually stop exposing profiles.security_answer_hash.
--
-- The previous attempt (20260728100000) used
--   REVOKE SELECT (security_answer_hash) ON profiles FROM anon;
-- which PostgreSQL accepts but silently does nothing here: a TABLE-level
-- SELECT grant confers access to EVERY column, and a column-level REVOKE
-- cannot subtract from it. Verified after that migration ran - real users'
-- hashes were still readable with the public key.
--
-- The working form is to drop the table-wide grant and re-grant SELECT on an
-- explicit column list that omits the secret.
--
-- Client prerequisite (already shipped): nothing selects `*` from profiles.
-- All reads name their columns (PROFILE_SELECT_COLUMNS), including the
-- post-update `.select(...)` chains in AuthContext and the admin
-- referral-count query. A `SELECT *` from anon/authenticated will now fail
-- with "permission denied", which is the intended behaviour.

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

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
  security_question_id,
  created_at,
  updated_at
) ON public.profiles TO anon, authenticated;

-- Writes are unchanged: RLS still restricts them to the owner's row, and
-- signup still needs to store the hash.
GRANT INSERT (security_answer_hash) ON public.profiles TO authenticated;
GRANT UPDATE (security_answer_hash) ON public.profiles TO authenticated;

-- service_role (edge functions, incl. reset-password-with-security) keeps
-- full access and remains the only reader of the hash.
