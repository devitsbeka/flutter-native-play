-- Entitlement and currency rules, as assertions.
--
-- 01-entitlements.sql prints a report a human reads. This is the same ground
-- expressed so a machine can grade it: anything that does not hold raises,
-- and with ON_ERROR_STOP the script exits non-zero. That is what makes it
-- usable as a CI gate.
--
-- Every assertion corresponds to a claim made in the P0 and currency commits.
-- If one starts failing, the claim stopped being true.

\set ON_ERROR_STOP on

-- ── helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE raised boolean := false;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN raised := true;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'ASSERTION FAILED (should have been refused): %', label;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, wanted %', label, got, want;
  END IF;
END $$;

-- ── fixtures ───────────────────────────────────────────────────────────────

DELETE FROM public.currency_grants WHERE user_id IN
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
DELETE FROM public.vip_subscriptions WHERE user_id IN
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
DELETE FROM public.user_daily_rewards WHERE user_id IN
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111','a@test'),
  ('22222222-2222-2222-2222-222222222222','b@test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('11111111-1111-1111-1111-111111111111','A', 1000, 10),
  ('22222222-2222-2222-2222-222222222222','B', 1000, 10)
ON CONFLICT (user_id) DO UPDATE SET coins = 1000, gems = 10;

SELECT set_config('test.uid','11111111-1111-1111-1111-111111111111', false);

-- ── currency: what a client may and may not do ─────────────────────────────

SELECT pg_temp.must_fail(
  $$SELECT public.update_user_currency('11111111-1111-1111-1111-111111111111'::uuid, 0, 999999)$$,
  'a signed-in user minting themselves gems');

SELECT pg_temp.must_fail(
  $$SELECT public.update_user_currency('22222222-2222-2222-2222-222222222222'::uuid, -500, 0)$$,
  'a signed-in user draining another account');

-- Spending is still allowed; only credits are gated.
SELECT pg_temp.must_equal(
  (SELECT new_coins FROM public.update_user_currency('11111111-1111-1111-1111-111111111111'::uuid, -100, 0)),
  900, 'spending your own coins');

-- ── gameplay rewards: bounded, not trusted ─────────────────────────────────

SELECT pg_temp.must_equal(
  (SELECT new_coins FROM public.credit_gameplay_reward('level_up', 150, 0, 'level 5')),
  1050, 'a level-up reward within its cap');

SELECT pg_temp.must_fail(
  $$SELECT public.credit_gameplay_reward('level_up', 99999, 0, NULL)$$,
  'a reward above the per-award ceiling');

SELECT pg_temp.must_fail(
  $$SELECT public.credit_gameplay_reward('free_money', 10, 0, NULL)$$,
  'a reward kind with no limits row');

-- level_up allows 5000/day and 150 is spent, so nine more 500s fit exactly.
DO $$
BEGIN
  FOR i IN 1..9 LOOP
    PERFORM public.credit_gameplay_reward('level_up', 500, 0, 'fill ' || i);
  END LOOP;
END $$;

SELECT pg_temp.must_fail(
  $$SELECT public.credit_gameplay_reward('level_up', 500, 0, 'overflow')$$,
  'a reward crossing the daily total for its kind');

-- ── subscriptions: not client-writable ─────────────────────────────────────

SET ROLE authenticated;
SELECT pg_temp.must_fail(
  $$INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
    VALUES ('11111111-1111-1111-1111-111111111111','pro_plus','2099-01-01')$$,
  'a direct client insert into vip_subscriptions');
RESET ROLE;

SELECT pg_temp.must_fail(
  $$SELECT public.grant_vip_days('decade')$$,
  'an unknown VIP duration');

-- Granted twice, a week should stack to fourteen days rather than reset.
DO $$
DECLARE first_expiry timestamptz; second_expiry timestamptz;
BEGIN
  SELECT expires_at INTO first_expiry  FROM public.grant_vip_days('week');
  SELECT expires_at INTO second_expiry FROM public.grant_vip_days('week');
  IF second_expiry <= first_expiry THEN
    RAISE EXCEPTION 'ASSERTION FAILED: a second grant did not extend the expiry';
  END IF;
  IF second_expiry::date <> (first_expiry + interval '7 days')::date THEN
    RAISE EXCEPTION 'ASSERTION FAILED: stacking added % not 7 days',
      second_expiry - first_expiry;
  END IF;
END $$;

SELECT pg_temp.must_equal(
  (SELECT public.ensure_admin_lifetime_pro()),
  false, 'lifetime PRO for an account that is neither admin nor allowlisted');

-- ── exchange: the rate is the server's ─────────────────────────────────────

DO $$
DECLARE before_coins integer; after_coins integer; after_gems integer;
BEGIN
  SELECT coins INTO before_coins FROM public.profiles
   WHERE user_id = '11111111-1111-1111-1111-111111111111';

  SELECT new_coins, new_gems INTO after_coins, after_gems
    FROM public.exchange_currency('gems_to_coins', 2);

  IF after_coins - before_coins <> 1000 THEN
    RAISE EXCEPTION 'ASSERTION FAILED: 2 gems bought % coins, expected 1000',
      after_coins - before_coins;
  END IF;
END $$;

SELECT pg_temp.must_fail(
  $$SELECT public.exchange_currency('coins_to_gems', 100)$$,
  'exchanging fewer coins than one gem costs');

SELECT pg_temp.must_fail(
  $$SELECT public.exchange_currency('gems_to_ferraris', 1)$$,
  'an unknown exchange direction');

-- ── daily reward: amount and frequency both decided here ───────────────────

SELECT pg_temp.must_equal(
  (SELECT coins_awarded FROM public.claim_daily_reward()),
  50, 'day one of the daily reward');

SELECT pg_temp.must_fail(
  $$SELECT public.claim_daily_reward()$$,
  'a second daily claim on the same day');

-- ── leaderboard reward: owner only, once ───────────────────────────────────

INSERT INTO public.category_weekly_rewards
  (id, category_id, user_id, week_start_date, week_end_date, final_rank,
   coins_rewarded, gems_rewarded)
SELECT '33333333-3333-3333-3333-333333333333', c.id,
       '22222222-2222-2222-2222-222222222222','2026-08-03','2026-08-09', 1, 5000, 20
FROM public.categories c LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Skip if the categories table came from a migration that could not apply.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.category_weekly_rewards
                  WHERE id = '33333333-3333-3333-3333-333333333333') THEN
    RAISE EXCEPTION
      'ASSERTION SETUP FAILED: no category available to attach a weekly reward to';
  END IF;
END $$;

-- Player A is not the owner.
SELECT pg_temp.must_fail(
  $$SELECT public.claim_leaderboard_reward('33333333-3333-3333-3333-333333333333')$$,
  'claiming a leaderboard reward belonging to someone else');

SELECT set_config('test.uid','22222222-2222-2222-2222-222222222222', false);

SELECT pg_temp.must_equal(
  (SELECT coins_awarded FROM public.claim_leaderboard_reward('33333333-3333-3333-3333-333333333333')),
  5000, 'the owner claiming their leaderboard reward');

SELECT pg_temp.must_fail(
  $$SELECT public.claim_leaderboard_reward('33333333-3333-3333-3333-333333333333')$$,
  'claiming the same leaderboard reward twice');

-- ── extra plays: the quota is sold, not given ──────────────────────────────
--
-- buy_extra_plays() is the one function that takes payment and moves the
-- free-play quota in the same breath, so both halves are checked: what the
-- player is charged, what they get back, and every way the pack is refused.

SELECT set_config('test.uid','11111111-1111-1111-1111-111111111111', false);

UPDATE public.profiles
   SET coins = 5000, gems = 10,
       free_plays_used = 5, free_plays_window_start = now(),
       free_plays_ad_grants = 0
 WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- A pack the price list does not have, and a way of paying it does not take.
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(2, 'coins') ->> 'reason'), 'bad_pack',
  'a pack size that is not sold');
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(1, 'wishes') ->> 'reason'), 'bad_source',
  'paying with something that is not a currency');
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(3, 'ad') ->> 'reason'), 'bad_pack',
  'one ad buying the three-game pack');

-- One game for 500 coins: the quota drops by one and so does the balance.
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(1, 'coins') ->> 'remaining')::integer, 1,
  'one game bought with coins');
SELECT pg_temp.must_equal(
  (SELECT coins FROM public.profiles
    WHERE user_id = '11111111-1111-1111-1111-111111111111'), 4500,
  'coins taken for one game');

-- Three games for 3 gems, from a quota that has three to give back.
UPDATE public.profiles SET free_plays_used = 5
 WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(3, 'gems') ->> 'remaining')::integer, 3,
  'three games bought with gems');
SELECT pg_temp.must_equal(
  (SELECT gems FROM public.profiles
    WHERE user_id = '11111111-1111-1111-1111-111111111111'), 7,
  'gems taken for three games');

-- A pack bigger than the hole it fills is refused rather than half-honoured:
-- two games used, three bought, one paid for and thrown away.
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(3, 'coins') ->> 'reason'), 'nothing_to_buy',
  'a pack larger than the games actually used');

-- An empty wallet buys nothing, and is told so rather than going negative.
UPDATE public.profiles
   SET coins = 100, gems = 0, free_plays_used = 5
 WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(1, 'coins') ->> 'reason'), 'insufficient_funds',
  'buying a game without the coins for it');
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(1, 'gems') ->> 'reason'), 'insufficient_funds',
  'buying a game without the gems for it');
SELECT pg_temp.must_equal(
  (SELECT coins FROM public.profiles
    WHERE user_id = '11111111-1111-1111-1111-111111111111'), 100,
  'a refused purchase leaves the balance alone');

-- Ads cost nothing and cannot be seen from here, so the window caps how many
-- games the claim is worth however many times it is made.
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(1, 'ad') ->> 'remaining')::integer, 1,
  'the first ad game');
UPDATE public.profiles SET free_plays_used = 5
 WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT public.buy_extra_plays(1, 'ad');
UPDATE public.profiles SET free_plays_used = 5
 WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT public.buy_extra_plays(1, 'ad');
UPDATE public.profiles SET free_plays_used = 5
 WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(1, 'ad') ->> 'reason'), 'ad_limit',
  'a fourth ad game in the same window');

-- A window that has aged out is already a fresh five; there is nothing to
-- sell, and consuming a play opens a new one with the ad allowance cleared.
UPDATE public.profiles
   SET free_plays_window_start = now() - interval '4 hours', free_plays_used = 5
 WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(1, 'coins') ->> 'reason'), 'nothing_to_buy',
  'buying games the expired window already gives back');
SELECT public.consume_free_play();
SELECT pg_temp.must_equal(
  (SELECT free_plays_ad_grants FROM public.profiles
    WHERE user_id = '11111111-1111-1111-1111-111111111111'), 0,
  'a fresh window clears the ad allowance');

-- Neither function is callable by a visitor who is not signed in.
SELECT set_config('test.uid','', false);
SELECT pg_temp.must_equal(
  (public.buy_extra_plays(1, 'coins') ->> 'reason'), 'not_authenticated',
  'buying games while signed out');
SELECT set_config('test.uid','11111111-1111-1111-1111-111111111111', false);

-- ── the ledger recorded all of it ──────────────────────────────────────────

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.currency_grants
   WHERE user_id = '11111111-1111-1111-1111-111111111111';
  -- 1 level-up + 9 fills + 1 exchange + 1 daily
  IF n <> 12 THEN
    RAISE EXCEPTION 'ASSERTION FAILED: ledger holds % rows for player A, expected 12', n;
  END IF;
END $$;

-- ── settling a quick game ──────────────────────────────────────────────────
--
-- Player C plays out the rule the product states: 500 to play, +500 for a
-- win, -500 for a loss. A separate player so the ledger counts above stay
-- what they were.

INSERT INTO auth.users (id, email) VALUES
  ('33333333-3333-3333-3333-333333333333','c@test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('33333333-3333-3333-3333-333333333333','C', 600, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 600, gems = 0;
DELETE FROM public.currency_grants WHERE user_id = '33333333-3333-3333-3333-333333333333';
DELETE FROM public.vip_subscriptions WHERE user_id = '33333333-3333-3333-3333-333333333333';
SELECT set_config('test.uid','33333333-3333-3333-3333-333333333333', false);

SELECT pg_temp.must_equal(
  (public.settle_quick_game('win', 'm1') ->> 'coins')::integer, 1100,
  '600 coins, one win');
SELECT pg_temp.must_equal(
  (public.settle_quick_game('lose', 'm2') ->> 'coins')::integer, 600,
  'and one loss');
SELECT pg_temp.must_equal(
  (public.settle_quick_game('draw', 'm3') ->> 'coins')::integer, 600,
  'a draw moves nothing');

-- The bug this function was written for: the daily ceiling counted credits
-- and ignored the debits that cancelled them, so a player whose net for the
-- day was zero stopped being paid at their 41st win. 60 matched pairs is
-- half again the old limit.
DO $$
DECLARE i integer; v_paid integer := 0;
BEGIN
  FOR i IN 1..60 LOOP
    IF public.settle_quick_game('win', 'pair-w-' || i) ->> 'reason' = 'settled' THEN
      v_paid := v_paid + 1;
    END IF;
    PERFORM public.settle_quick_game('lose', 'pair-l-' || i);
  END LOOP;
  IF v_paid <> 60 THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % of 60 matched wins paid, expected all of them', v_paid;
  END IF;
END $$;
SELECT pg_temp.must_equal(
  (SELECT coins FROM public.profiles WHERE user_id = '33333333-3333-3333-3333-333333333333'), 600,
  '60 wins and 60 losses end where they began');

-- The ceiling is still a ceiling. A client claiming nothing but wins stops.
DELETE FROM public.currency_grants WHERE user_id = '33333333-3333-3333-3333-333333333333';
DO $$
DECLARE i integer; v_paid integer := 0;
BEGIN
  FOR i IN 1..60 LOOP
    IF public.settle_quick_game('win', 'greedy-' || i) ->> 'reason' = 'settled' THEN
      v_paid := v_paid + 1;
    END IF;
  END LOOP;
  -- 20000 a day at 500 a win
  IF v_paid <> 40 THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % unmatched wins paid, expected 40', v_paid;
  END IF;
END $$;

-- One match settles once, however many times it is submitted.
DELETE FROM public.currency_grants WHERE user_id = '33333333-3333-3333-3333-333333333333';
UPDATE public.profiles SET coins = 600
 WHERE user_id = '33333333-3333-3333-3333-333333333333';
SELECT public.settle_quick_game('win', 'same-match');
SELECT pg_temp.must_equal(
  (public.settle_quick_game('win', 'same-match') ->> 'reason'), 'already_settled',
  'settling one match twice');
SELECT pg_temp.must_equal(
  (SELECT coins FROM public.profiles WHERE user_id = '33333333-3333-3333-3333-333333333333'), 1100,
  'and it was only paid once');

-- A loss takes the stake or the balance, whichever is smaller. Asking the
-- currency RPC for more than the balance used to take nothing at all while
-- the result screen still announced -500.
UPDATE public.profiles SET coins = 300
 WHERE user_id = '33333333-3333-3333-3333-333333333333';
SELECT pg_temp.must_equal(
  (public.settle_quick_game('lose', 'short-1') ->> 'applied')::integer, -300,
  'losing with less than the stake');
SELECT pg_temp.must_equal(
  (public.settle_quick_game('lose', 'short-2') ->> 'reason'), 'no_balance',
  'losing with nothing left');
SELECT pg_temp.must_equal(
  (SELECT coins FROM public.profiles WHERE user_id = '33333333-3333-3333-3333-333333333333'), 0,
  'a balance never goes below zero');

-- PRO plays for free, and is still paid for a win.
UPDATE public.profiles SET coins = 600
 WHERE user_id = '33333333-3333-3333-3333-333333333333';
INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
VALUES ('33333333-3333-3333-3333-333333333333','pro', now() + interval '30 days')
ON CONFLICT (user_id) DO UPDATE SET expires_at = EXCLUDED.expires_at;
SELECT pg_temp.must_equal(
  (public.settle_quick_game('lose', 'pro-1') ->> 'reason'), 'vip_free',
  'a PRO player loses nothing');
SELECT pg_temp.must_equal(
  (public.settle_quick_game('win', 'pro-2') ->> 'applied')::integer, 500,
  'and still earns a win');

-- The amount is never the client's to name, and the outcome is checked.
SELECT pg_temp.must_fail(
  $$SELECT public.settle_quick_game('win; DROP TABLE profiles', NULL)$$,
  'an outcome that is not one of the three');
SELECT set_config('test.uid','', false);
SELECT pg_temp.must_fail(
  $$SELECT public.settle_quick_game('win', NULL)$$,
  'settling a game while signed out');
SELECT set_config('test.uid','11111111-1111-1111-1111-111111111111', false);

-- And the debit kind can never be turned into a credit.
SELECT pg_temp.must_fail(
  $$SELECT public.credit_gameplay_reward('stake_loss', 500, 0, NULL)$$,
  'granting coins under the loss ledger kind');

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.settle_quick_game(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ASSERTION FAILED: anon can call settle_quick_game';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.settle_quick_game(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ASSERTION FAILED: authenticated cannot call settle_quick_game';
  END IF;
END $$;

\echo 'All entitlement and currency assertions hold.'
