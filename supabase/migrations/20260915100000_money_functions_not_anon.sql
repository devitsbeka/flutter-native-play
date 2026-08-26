-- claim_daily_reward is callable by `anon`, and should not be.
--
-- Probing the live database with the publishable key returns
-- `P0001 "Not authenticated"` — which is the function's OWN first line
-- raising, meaning the caller got past the permission check and ran the body.
-- A properly revoked function answers `42501 permission denied for function`,
-- which is what ensure_admin_lifetime_pro does.
--
-- WHY, because the migration that created it looks correct:
--
--   REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM public;
--
-- `public` there is the PUBLIC pseudo-role. Supabase's project bootstrap runs
--
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
--
-- so every new function in `public` is granted to `anon` EXPLICITLY, and
-- revoking the PUBLIC grant does not touch an explicit one. CLAUDE.md rule 3
-- says "revoked from PUBLIC and anon" for exactly this reason; nine
-- migrations in this repo write `FROM PUBLIC, anon` and twenty write
-- `FROM public` alone. The daily-reward family has been in the second group
-- since 20260813, through five successive rewrites of the same function.
--
-- WHAT IT IS WORTH: not an exploit today. claim_daily_reward's first act is
--
--   IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
--
-- and auth.uid() is NULL for an anon caller, so nothing is written and
-- nothing is disclosed. It is defended by its body rather than by its grant,
-- which is one careless edit away from mattering, and it is inconsistent with
-- every other function that moves money.
--
-- All seven are listed below, not just the one that needs it. REVOKE on a
-- privilege that was never granted is a no-op, so naming the whole family
-- costs nothing and stops this migration from being read as "only that one
-- was ever at risk".
--
-- NOT touched, deliberately: the TV functions. tv_claim_session,
-- submit_tv_answer, tv_advance_question and award_tv_observer_bonus are
-- anon-executable BY DESIGN — the television is not signed in — and each is
-- bounded server-side rather than by the caller's identity.
-- award_tv_observer_bonus, for instance, takes its recipient from the
-- session's current_round_suggester_id, computes the amount from the answer
-- table, and claims each (session, question) exactly once through
-- tv_observer_awards. Revoking those would break TV mode.

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'claim_daily_reward',
         'claim_leaderboard_reward',
         'credit_gameplay_reward',
         'exchange_currency',
         'grant_vip_days',
         'ensure_admin_lifetime_pro',
         'update_user_currency'
       )
  LOOP
    -- By identity signature rather than a hand-written argument list, so an
    -- overload or a later signature change cannot leave one behind.
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
  END LOOP;
END $$;

-- The grants these functions are supposed to have, restated so a revoke
-- cannot leave a caller who needs one without it. update_user_currency is
-- called by signed-in clients (it refuses positive deltas from them);
-- grant_vip_days and ensure_admin_lifetime_pro are for the webhook and the
-- admin path.
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

-- Refuse to commit if any of them is still reachable by anon.
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN (
       'claim_daily_reward', 'claim_leaderboard_reward', 'credit_gameplay_reward',
       'exchange_currency', 'grant_vip_days', 'ensure_admin_lifetime_pro',
       'update_user_currency'
     )
     AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'still reachable by anon: %', bad;
  END IF;
END $$;
