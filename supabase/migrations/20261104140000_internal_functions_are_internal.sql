-- Five SECURITY DEFINER functions that say they are internal, and are not.
--
-- Found by asking Postgres rather than by reading the migrations:
--
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname='public' AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
--
-- and cross-checking against the ones no migration ever GRANTs. The trap is
-- the one supabase/tests/08-money-not-anon.sql already documents in full:
--
--   Supabase's bootstrap runs
--     ALTER DEFAULT PRIVILEGES IN SCHEMA public
--       GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
--   so a new function is granted to those roles EXPLICITLY, and
--     REVOKE ALL ON FUNCTION ... FROM public;
--   revokes the PUBLIC pseudo-role, not the explicit grant.
--
-- That test caught it for `anon` and has been green ever since. It never
-- checked `authenticated`, and every function below is revoked "FROM public"
-- alone — so the door it looks like they closed has been open the whole time
-- to anyone signed in, which is anyone who can tap "create account".
--
-- The worst of them by a distance:
--
--   apply_currency_grant(user_id, kind, coins, gems, reference)
--
-- is the internal credit primitive that 20260813150000 introduced with the
-- comment "Not granted to anyone. Everything below calls it". It applies a
-- balance change with NO ceiling — it is the thing `credit_gameplay_reward`
-- wraps precisely so that a cap can be applied first. Called directly:
--
--   await supabase.rpc('apply_currency_grant', {
--     p_user_id: me, p_kind: 'x', p_coins: 999999, p_gems: 9999 })
--
-- That is the entire server-authoritative currency system bypassed in one
-- call, by the function it was built around. Verified against a real Postgres
-- with the harness's own role setup: it returns the new balance.
--
-- `befriend_room_players()` is the same mistake with a smaller blast radius —
-- it is meant to run from the room-completion trigger and settles friendships
-- for everyone in a room, including undoing a block (20261013110000 had to
-- teach it about user_blocks for exactly that reason).
--
-- The other three arrived with the shop and avatar work in 20261104110000 and
-- 20261104130000 and are revoked properly there now; they are repeated here so
-- that this migration is the one place to look, and so applying it to a
-- database that already has them is still correct.

REVOKE ALL ON FUNCTION public.apply_currency_grant(uuid, text, integer, integer, text)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.befriend_room_players()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.grant_power_ups(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_avatar_generation(uuid, boolean)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.refund_avatar_generation(uuid)
  FROM PUBLIC, anon, authenticated;

-- The service role bypasses this entirely (it is not subject to function
-- privileges the way a signed-in role is), and a SECURITY DEFINER function
-- calling another executes as the owner — so every legitimate caller still
-- works: credit_gameplay_reward, claim_daily_reward, claim_leaderboard_reward,
-- purchase_shop_item, purchase_power_up, grant_reward_power_up, the
-- room-completion trigger, and the generate-avatar edge function.
