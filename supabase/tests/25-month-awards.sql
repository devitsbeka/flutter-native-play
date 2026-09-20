-- The monthly leaderboard award, as assertions.
--
-- This one pays real currency to people who are not the caller, decided by a
-- ranking the caller cannot see, on a schedule nothing fires. Every claim in
-- 20261107110000_monthly_leaderboard_awards.sql is checked here against a
-- real Postgres rather than trusted because the SQL compiled.
--
-- Run after the shim and every migration:
--   psql -h /tmp -p 55432 -U postgres -f supabase/tests/25-month-awards.sql

\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE raised boolean := false;
BEGIN
  BEGIN EXECUTE stmt; EXCEPTION WHEN OTHERS THEN raised := true; END;
  IF NOT raised THEN
    RAISE EXCEPTION 'ASSERTION FAILED (should have been refused): %', label;
  END IF;
  RAISE NOTICE 'ok (refused): %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, want %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', u::text, false); $$;

-- A player, with a country and an empty purse. `profiles.user_id` is a
-- foreign key onto auth.users, so the account has to exist first.
CREATE OR REPLACE FUNCTION pg_temp.player(u uuid, nick text, cc text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO auth.users (id, email) VALUES (u, u::text || '@test')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.profiles (user_id, nickname, country_code, coins, gems)
  VALUES (u, nick, cc, 0, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET nickname = EXCLUDED.nickname,
        country_code = EXCLUDED.country_code,
        coins = 0, gems = 0;
$$;

-- A ledger row in a given month, without going through a gameplay function.
CREATE OR REPLACE FUNCTION pg_temp.earn(u uuid, kind text, coins int, period date)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference, created_at)
  VALUES (u, kind, coins, 0, 'test', period + interval '5 days');
$$;

DO $$
DECLARE
  -- Two countries, so the country board has something to be separate from.
  ge1 uuid := 'a0000000-0000-0000-0000-000000000001';
  ge2 uuid := 'a0000000-0000-0000-0000-000000000002';
  ge3 uuid := 'a0000000-0000-0000-0000-000000000003';
  ge4 uuid := 'a0000000-0000-0000-0000-000000000004';
  us1 uuid := 'b0000000-0000-0000-0000-000000000001';
  us2 uuid := 'b0000000-0000-0000-0000-000000000002';
  buyer uuid := 'c0000000-0000-0000-0000-000000000001';
  boss  uuid := 'd0000000-0000-0000-0000-000000000001';
  ghost uuid := 'e0000000-0000-0000-0000-000000000001';
  last_month date := (date_trunc('month', now()) - interval '1 month')::date;
  this_month date := date_trunc('month', now())::date;
  v_int int; v_big bigint; v_txt text; v_id uuid;
BEGIN
  DELETE FROM public.leaderboard_month_awards;
  DELETE FROM public.leaderboard_month_settled;
  DELETE FROM public.currency_grants;

  PERFORM pg_temp.player(ge1, 'Gio',    'GE');
  PERFORM pg_temp.player(ge2, 'Nika',   'GE');
  PERFORM pg_temp.player(ge3, 'Tiko',   'GE');
  PERFORM pg_temp.player(ge4, 'Lasha',  'GE');
  PERFORM pg_temp.player(us1, 'Gloria', 'US');
  PERFORM pg_temp.player(us2, 'Beka',   'US');
  PERFORM pg_temp.player(buyer, 'Whale', 'US');
  PERFORM pg_temp.player(boss, 'Admin', 'GE');
  PERFORM pg_temp.player(ghost, '[წაშლილი]', 'GE');

  INSERT INTO public.user_roles (user_id, role) VALUES (boss, 'admin')
    ON CONFLICT DO NOTHING;

  -- ── the month being settled ──────────────────────────────────────────────
  --
  -- Earnings, deliberately ordered so global and country disagree.
  PERFORM pg_temp.earn(ge1, 'quiz_reward', 50000, last_month);  -- global 1
  PERFORM pg_temp.earn(us1, 'stake_win',   40000, last_month);  -- global 2
  PERFORM pg_temp.earn(ge2, 'room_prize',  30000, last_month);  -- global 3
  PERFORM pg_temp.earn(ge3, 'mission',     20000, last_month);  -- GE 1 after
  PERFORM pg_temp.earn(ge4, 'spin',        10000, last_month);  -- GE 2 after
  PERFORM pg_temp.earn(us2, 'chest',        5000, last_month);  -- US 1 after

  -- Bought coins and converted gems are not earnings, however large.
  PERFORM pg_temp.earn(buyer, 'shop_grant', 900000, last_month);
  PERFORM pg_temp.earn(buyer, 'exchange',   900000, last_month);

  -- An admin outearning everyone is still not on the board.
  PERFORM pg_temp.earn(boss, 'quiz_reward', 999999, last_month);
  -- Nor is a deleted account.
  PERFORM pg_temp.earn(ghost, 'quiz_reward', 999999, last_month);

  -- This month's play must not count towards last month.
  PERFORM pg_temp.earn(us2, 'quiz_reward', 999999, this_month);

  -- ── settle ───────────────────────────────────────────────────────────────

  PERFORM public.settle_leaderboard_month();

  SELECT count(*) INTO v_int
    FROM public.leaderboard_month_awards WHERE period = last_month;
  PERFORM pg_temp.must_equal(v_int, 6, 'three global and three country awards');

  -- 1. The global podium is the three biggest earners, in order.
  SELECT user_id INTO v_id FROM public.leaderboard_month_awards
   WHERE period = last_month AND scope = 'global' AND rank = 1;
  PERFORM pg_temp.must_equal(v_id, ge1, 'global 1st is the biggest earner');

  SELECT user_id INTO v_id FROM public.leaderboard_month_awards
   WHERE period = last_month AND scope = 'global' AND rank = 2;
  PERFORM pg_temp.must_equal(v_id, us1, 'global 2nd');

  SELECT user_id INTO v_id FROM public.leaderboard_month_awards
   WHERE period = last_month AND scope = 'global' AND rank = 3;
  PERFORM pg_temp.must_equal(v_id, ge2, 'global 3rd');

  -- 2. The prizes are the ones in the table.
  SELECT coins INTO v_int FROM public.leaderboard_month_awards
   WHERE period = last_month AND scope = 'global' AND rank = 1;
  PERFORM pg_temp.must_equal(v_int, 15000, 'global 1st pays 15,000 coins');
  SELECT gems INTO v_int FROM public.leaderboard_month_awards
   WHERE period = last_month AND scope = 'global' AND rank = 1;
  PERFORM pg_temp.must_equal(v_int, 3, 'global 1st pays 3 gems');

  -- 3. It was actually paid, and the ledger says so.
  SELECT coins INTO v_int FROM public.profiles WHERE user_id = ge1;
  PERFORM pg_temp.must_equal(v_int, 15000, 'the winner''s balance moved');
  SELECT gems INTO v_int FROM public.profiles WHERE user_id = ge1;
  PERFORM pg_temp.must_equal(v_int, 3, 'and their gems');
  SELECT count(*) INTO v_int FROM public.currency_grants
   WHERE user_id = ge1 AND kind = 'month_award';
  PERFORM pg_temp.must_equal(v_int, 1, 'with one ledger row');

  -- 4. Nobody is paid twice in a month: a global winner is out of the
  --    running on their own country's board, and the slot falls through.
  SELECT count(*) INTO v_int FROM public.leaderboard_month_awards
   WHERE period = last_month AND user_id = ge1;
  PERFORM pg_temp.must_equal(v_int, 1, 'the global winner has exactly one award');

  SELECT user_id INTO v_id FROM public.leaderboard_month_awards
   WHERE period = last_month AND scope = 'country' AND country_code = 'GE' AND rank = 1;
  PERFORM pg_temp.must_equal(v_id, ge3,
    'Georgia 1st is the best earner who did not already win globally');

  SELECT user_id INTO v_id FROM public.leaderboard_month_awards
   WHERE period = last_month AND scope = 'country' AND country_code = 'US' AND rank = 1;
  PERFORM pg_temp.must_equal(v_id, us2, 'and the US board backfills the same way');

  -- 5. Bought coins bought nothing.
  SELECT count(*) INTO v_int FROM public.leaderboard_month_awards
   WHERE period = last_month AND user_id = buyer;
  PERFORM pg_temp.must_equal(v_int, 0, 'shop_grant and exchange do not rank');

  -- 6. Admins and deleted accounts are off the board.
  SELECT count(*) INTO v_int FROM public.leaderboard_month_awards
   WHERE period = last_month AND user_id IN (boss, ghost);
  PERFORM pg_temp.must_equal(v_int, 0, 'no admin, no deleted account');

  -- 7. The award records what won it.
  SELECT earned_coins INTO v_big FROM public.leaderboard_month_awards
   WHERE period = last_month AND scope = 'global' AND rank = 1;
  PERFORM pg_temp.must_equal(v_big, 50000::bigint, 'the winning total is kept');

  -- ── running it again ─────────────────────────────────────────────────────

  PERFORM public.settle_leaderboard_month();
  PERFORM public.settle_leaderboard_month();

  SELECT count(*) INTO v_int FROM public.leaderboard_month_awards
   WHERE period = last_month;
  PERFORM pg_temp.must_equal(v_int, 6, 'settling again awards nothing new');

  SELECT coins INTO v_int FROM public.profiles WHERE user_id = ge1;
  PERFORM pg_temp.must_equal(v_int, 15000, 'and pays nobody twice');

  -- 8. The current month is never settled — it is not over.
  SELECT count(*) INTO v_int FROM public.leaderboard_month_awards
   WHERE period = this_month;
  PERFORM pg_temp.must_equal(v_int, 0, 'the month in progress is left alone');

  -- 9. The award's own coins do not count towards the next month.
  SELECT count(*) INTO v_int FROM public.leaderboard_earning_kinds
   WHERE kind = 'month_award';
  PERFORM pg_temp.must_equal(v_int, 0, 'month_award is not an earning kind');

  SELECT COALESCE(SUM(e.earned), 0)::bigint INTO v_big
    FROM public.leaderboard_month_earnings(this_month) e WHERE e.user_id = ge1;
  PERFORM pg_temp.must_equal(v_big, 0::bigint,
    'so winning last month is worth nothing this month');

  RAISE NOTICE '--- settle and payout: all assertions passed';
END $$;

-- ── who may call what ──────────────────────────────────────────────────────

DO $$
BEGIN
  -- The payout primitive trusts its arguments completely: the ranking is the
  -- authorisation. A signed-in caller reaching it could award themselves.
  PERFORM pg_temp.must_equal(
    has_function_privilege('authenticated', 'public.pay_month_award(date, text, text, integer, uuid, bigint)', 'EXECUTE'),
    false, 'pay_month_award is not callable by a signed-in user');
  PERFORM pg_temp.must_equal(
    has_function_privilege('anon', 'public.pay_month_award(date, text, text, integer, uuid, bigint)', 'EXECUTE'),
    false, 'nor by anon');

  -- Settling is safe to call — it decides everything itself — but not by a
  -- logged-out visitor, who has no reason to and would be doing it for free.
  PERFORM pg_temp.must_equal(
    has_function_privilege('authenticated', 'public.settle_leaderboard_month()', 'EXECUTE'),
    true, 'a signed-in player may settle');
  PERFORM pg_temp.must_equal(
    has_function_privilege('anon', 'public.settle_leaderboard_month()', 'EXECUTE'),
    false, 'anon may not');
  PERFORM pg_temp.must_equal(
    has_function_privilege('anon', 'public.leaderboard_month_earnings(date)', 'EXECUTE'),
    false, 'nor read the earnings ranking');

  RAISE NOTICE '--- grants: all assertions passed';
END $$;

-- ── the awards table is read-only to clients ───────────────────────────────

DO $$
BEGIN
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'leaderboard_month_awards'
        AND cmd <> 'SELECT'),
    0, 'no client may write an award row');
  RAISE NOTICE '--- policies: all assertions passed';
END $$;
