-- Nothing that moves money is reachable by an unauthenticated caller.
--
-- claim_daily_reward was. Probing the live database with the publishable key
-- returned `P0001 "Not authenticated"` — the function's own first line
-- raising, which means the caller got past the permission check and into the
-- body. A properly revoked function answers `42501 permission denied for
-- function`.
--
-- The cause is a two-line trap. Supabase's bootstrap runs
--
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
--
-- so a new function is granted to anon EXPLICITLY, and
--
--   REVOKE ALL ON FUNCTION ... FROM public;
--
-- revokes the PUBLIC pseudo-role, not the explicit grant. The migration reads
-- as if it closed the door. Nine migrations in this repo write
-- `FROM PUBLIC, anon` and twenty write `FROM public` alone, so the difference
-- is a coin flip on who wrote which one — which is why this is a test rather
-- than a fix and a hope.
--
-- The default privileges are in 00-supabase-shim.sql. They have to be: without
-- them these assertions pass on every function in the schema and catch
-- nothing, because the harness never grants anon anything to begin with.
--
-- WHAT IS DELIBERATELY NOT HERE: the TV functions. tv_claim_session,
-- submit_tv_answer, tv_advance_question and award_tv_observer_bonus are
-- anon-executable by design — the television is not signed in — and they are
-- bounded server-side instead. award_tv_observer_bonus takes its recipient
-- from the session's current_round_suggester_id rather than from the caller,
-- computes the amount from the answer table, and claims each
-- (session, question) exactly once through tv_observer_awards. An anon caller
-- can only trigger an award that was going to happen anyway, to somebody they
-- do not choose, once. Asserting against those would break TV mode to fix
-- nothing.

\set ON_ERROR_STOP on
\pset pager off

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got bigint, want bigint, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAILED: % -- got %, want %', label, got, want;
  END IF;
END $$;

-- The shim has to actually be in force, or everything below is vacuous.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n
    FROM pg_default_acl d
    JOIN pg_namespace n2 ON n2.oid = d.defaclnamespace
   WHERE n2.nspname = 'public' AND d.defaclobjtype = 'f'
     AND array_to_string(d.defaclacl, ',') LIKE '%anon=%';
  IF n = 0 THEN
    RAISE EXCEPTION 'the shim no longer grants anon by default -- every assertion below would pass for the wrong reason';
  END IF;
END $$;

-- The functions that decide what a player owns.
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
    RAISE EXCEPTION 'anon can call: % -- revoke FROM PUBLIC, anon (not FROM public alone)', bad;
  END IF;
END $$;

-- And the ones a caller who IS signed in still needs, so the revoke above
-- cannot be "fixed" by taking the grant away from everybody.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n
    FROM pg_proc p JOIN pg_namespace nn ON nn.oid = p.pronamespace
   WHERE nn.nspname = 'public' AND p.proname = 'claim_daily_reward'
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  PERFORM pg_temp.must_equal(n, 1, 'a signed-in player can still claim their daily reward');
END $$;

\echo 'ok: money functions are not reachable by anon'
