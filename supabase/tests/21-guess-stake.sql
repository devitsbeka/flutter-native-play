-- The Guess card's stake, executed: 200 to play, +200 for a pass, -200 for
-- a fail, once per run, floored at the balance, under the same daily
-- ceiling as the quick game, and out of anon's reach.
--
-- Same harness as the other suites (see README.md).

\set ON_ERROR_STOP on
\pset pager off

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, wanted %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

-- ── privilege posture ──────────────────────────────────────────────────────

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.settle_guess_game(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can call settle_guess_game -- revoke FROM PUBLIC, anon';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.settle_guess_game(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot call settle_guess_game';
  END IF;
  RAISE NOTICE 'ok: settle_guess_game is for signed-in players only';
END $$;

-- ── the rule ───────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email) VALUES
  ('21000000-0000-0000-0000-000000000001', 'guess@test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('21000000-0000-0000-0000-000000000001', 'Guesser', 300, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 300, gems = 0;
DELETE FROM public.currency_grants WHERE user_id = '21000000-0000-0000-0000-000000000001';
SELECT set_config('test.uid', '21000000-0000-0000-0000-000000000001', false);

SELECT pg_temp.must_equal(
  (public.settle_guess_game('win', 'run-1') ->> 'coins')::integer, 500,
  '300 coins, one pass: +200');
SELECT pg_temp.must_equal(
  (public.settle_guess_game('lose', 'run-2') ->> 'coins')::integer, 300,
  'one fail: -200');
SELECT pg_temp.must_equal(
  (public.settle_guess_game('draw', 'run-3') ->> 'coins')::integer, 300,
  'a draw moves nothing');

-- Once per run, however many times the results screen asks.
SELECT pg_temp.must_equal(
  public.settle_guess_game('win', 'run-1') ->> 'reason', 'already_settled',
  'the same run does not pay twice');
SELECT pg_temp.must_equal(
  (SELECT coins FROM public.profiles WHERE user_id = '21000000-0000-0000-0000-000000000001'), 300,
  'and the balance did not move for it');

-- A fail never takes the player below zero.
UPDATE public.profiles SET coins = 120 WHERE user_id = '21000000-0000-0000-0000-000000000001';
SELECT pg_temp.must_equal(
  (public.settle_guess_game('lose', 'run-4') ->> 'applied')::integer, -120,
  'a fail at 120 coins takes 120, not 200');
SELECT pg_temp.must_equal(
  public.settle_guess_game('lose', 'run-5') ->> 'reason', 'no_balance',
  'and at zero takes nothing');

-- The ledger rows are the quick game's kinds, so one daily ceiling covers both.
SELECT pg_temp.must_equal(
  (SELECT count(*) FROM public.currency_grants
    WHERE user_id = '21000000-0000-0000-0000-000000000001'
      AND kind IN ('stake_win', 'stake_loss'))::integer, 3,
  'three settlements, three stake rows');

-- The client never names an amount.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'settle_guess_game'
       AND p.pronargs <> 2
  ) THEN
    RAISE EXCEPTION 'settle_guess_game takes an outcome and a reference, nothing else';
  END IF;
  RAISE NOTICE 'ok: the amount is the function''s, not the caller''s';
END $$;
