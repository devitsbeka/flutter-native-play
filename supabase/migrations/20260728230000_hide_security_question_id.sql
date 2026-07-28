-- Lovable security scan, WARNING: "All user profile data is publicly
-- readable" - the part of it that can be closed without a product decision.
--
-- Verified against production with nothing but the anon key: a logged-out
-- stranger can read all 645 profiles, including coins, gems, referral_code
-- and security_question_id. (security_answer_hash is already blocked - the
-- earlier column-grant migration holds, which is why `select=*` now returns
-- 42501 for anon.)
--
-- security_question_id is the one that belongs with the hash. It names which
-- security question guards an account, which is a direct aid to attacking
-- the password-reset flow: pick a user, learn their question, then guess.
-- Publishing the question while carefully protecting the answer defeats much
-- of the point of protecting the answer.
--
-- It is safe to revoke because the client never reads it. The forgot-password
-- flow gets it from the `reset-password-with-security` edge function
-- (service role), not from the table - see src/pages/ForgotPassword.tsx,
-- which calls functions.invoke('reset-password-with-security',
-- {action:'get-question'}). Signup WRITES the column; nothing reads it back.
--
-- Column-level REVOKE is a silent no-op while a table-level SELECT grant
-- exists, so - exactly as with the hash - the grant is REPLACED by an
-- explicit column list that simply omits this one.
--
-- NOT addressed here, deliberately: coins, gems, referral_code and
-- referred_by_invite_id are also world-readable, but each is read by the
-- owner's own client, and column privileges are per-ROLE, not per-ROW - they
-- cannot say "yours yes, theirs no". Fixing those properly means a
-- public_profiles view plus self-only RLS on the table, and rewriting every
-- call site that reads another user's profile. That is a change worth doing
-- carefully with a play-test, not bolted onto this one.

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
