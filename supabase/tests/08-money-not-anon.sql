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

-- ---------------------------------------------------------------------------
-- ...and the INTERNAL ones are reachable by neither role.
--
-- Everything above checks `anon`, and has been green since it was written.
-- It was also only half the trap. The same explicit default grant Supabase
-- hands `anon` it also hands `authenticated`, so `REVOKE ... FROM public`
-- alone leaves a function open to anyone signed in — which is anyone who can
-- tap "create account".
--
-- Five SECURITY DEFINER functions were in that state, each documented as
-- internal and each revoked FROM public alone. The worst was
-- `apply_currency_grant`: the UNCAPPED credit primitive that
-- `credit_gameplay_reward` exists to wrap so a ceiling can be applied first.
-- One rpc call minted 999 999 coins and 9 999 gems, bypassing every row in
-- currency_grant_limits — the whole server-authoritative currency system,
-- undone by the function it was built around.
--
-- The rule: a function no migration ever GRANTs is internal, and internal
-- means neither role. Named explicitly rather than derived, because a derived
-- list grows silently and this check already failed once by being too narrow.
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.proname || ' (' || r.rolname || ')', ', ') INTO bad
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
   WHERE n.nspname = 'public'
     AND p.proname IN (
       'apply_currency_grant', 'befriend_room_players', 'grant_power_ups',
       'claim_avatar_generation', 'refund_avatar_generation'
     )
     AND has_function_privilege(r.rolname, p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION
      'internal functions are callable: % -- revoke FROM PUBLIC, anon, authenticated (not FROM public alone)',
      bad;
  END IF;
END $$;

-- The capped wrappers must still work, or the revoke went too far and took
-- the legitimate path with it.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n
    FROM pg_proc p JOIN pg_namespace nn ON nn.oid = p.pronamespace
   WHERE nn.nspname = 'public'
     AND p.proname IN ('credit_gameplay_reward', 'purchase_shop_item',
                       'purchase_power_up', 'grant_reward_power_up',
                       'claim_vip_frame', 'exchange_currency')
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  PERFORM pg_temp.must_equal(n, 6, 'the capped wrappers a signed-in player needs still work');
END $$;

\echo 'ok: money functions are not reachable by anon, and internal ones by nobody'
