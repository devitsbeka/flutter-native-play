-- Nothing is staked, nothing is lost (20261108100000_no_wagering), executed.
--
-- Replaces 15-room-pot, 21-guess-stake and 23-honest-pot, which asserted the
-- wager itself. The parts of them that were never about money — who may
-- settle, once per round, invitations and the observing host are not
-- players, the ledger reads without settling, complete_room_round records
-- the seated only — are kept here.
--
-- Same harness as the other suites (see README.md). The quick game's half is
-- in 02-assertions.sql.

\set ON_ERROR_STOP on
\pset pager off

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
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, wanted %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

CREATE OR REPLACE FUNCTION pg_temp.coins_of(u uuid) RETURNS integer
LANGUAGE sql AS $$ SELECT coins FROM public.profiles WHERE user_id = u; $$;

-- ── privilege posture ──────────────────────────────────────────────────────

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.settle_guess_game(text, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.settle_room_round(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.room_round_ledger(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can call a settlement or read a ledger';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.settle_guess_game(text, text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.settle_room_round(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot settle';
  END IF;
  RAISE NOTICE 'ok: settlements are for signed-in players only';
END $$;

-- ── the Guess card ─────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email) VALUES
  ('26000000-0000-0000-0000-000000000001', 'guess@test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('26000000-0000-0000-0000-000000000001', 'Guesser', 300, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 300, gems = 0;
DELETE FROM public.currency_grants WHERE user_id = '26000000-0000-0000-0000-000000000001';
SELECT set_config('test.uid', '26000000-0000-0000-0000-000000000001', false);

SELECT pg_temp.must_equal(
  (public.settle_guess_game('win', 'run-1') ->> 'coins')::integer, 400,
  'a pass pays 100');
SELECT pg_temp.must_equal(
  (public.settle_guess_game('lose', 'run-2') ->> 'coins')::integer, 400,
  'a fail costs nothing');
SELECT pg_temp.must_equal(
  (public.settle_guess_game('draw', 'run-3') ->> 'coins')::integer, 400,
  'nor does a draw');
SELECT pg_temp.must_equal(
  public.settle_guess_game('win', 'run-1') ->> 'reason', 'already_settled',
  'the same run does not pay twice');

UPDATE public.profiles SET coins = 0 WHERE user_id = '26000000-0000-0000-0000-000000000001';
SELECT pg_temp.must_equal(
  (public.settle_guess_game('lose', 'run-4') ->> 'applied')::integer, 0,
  'a fail at zero coins takes nothing and needs nothing');
SELECT pg_temp.must_equal(
  (SELECT count(*)::integer FROM public.currency_grants
    WHERE user_id = '26000000-0000-0000-0000-000000000001' AND coins < 0), 0,
  'the Guess card never writes a debit');

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

-- ── rooms ──────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email) VALUES
  ('26000000-0000-0000-0000-00000000000a','nw-a@test'),
  ('26000000-0000-0000-0000-00000000000b','nw-b@test'),
  ('26000000-0000-0000-0000-00000000000c','nw-c@test'),
  ('26000000-0000-0000-0000-00000000000d','nw-d@test'),
  ('26000000-0000-0000-0000-00000000000f','nw-f@test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('26000000-0000-0000-0000-00000000000a','a', 1000, 0),
  ('26000000-0000-0000-0000-00000000000b','b', 1000, 0),
  ('26000000-0000-0000-0000-00000000000c','c', 1000, 0),
  ('26000000-0000-0000-0000-00000000000d','d', 1000, 0),
  ('26000000-0000-0000-0000-00000000000f','f', 1000, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 1000, gems = 0;
DELETE FROM public.game_rooms WHERE host_user_id = '26000000-0000-0000-0000-00000000000a';
DELETE FROM public.currency_grants WHERE user_id::text LIKE '26000000-%';

DO $$
DECLARE
  a uuid := '26000000-0000-0000-0000-00000000000a';
  b uuid := '26000000-0000-0000-0000-00000000000b';
  c uuid := '26000000-0000-0000-0000-00000000000c';
  d uuid := '26000000-0000-0000-0000-00000000000d';
  outsider uuid := '26000000-0000-0000-0000-00000000000f';
  v_room uuid;
  v_game uuid;
  v_res jsonb;
  v_led jsonb;
BEGIN
  -- ── two players: the winner is paid by the house, the loser keeps all ──
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('NW0001', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 120), (v_room, b, 'b', false, 275);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;

  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail(format('SELECT public.settle_room_round(%L, %L)', v_room, v_game),
    'anonymous caller refused');
  PERFORM pg_temp.as_user(outsider);
  PERFORM pg_temp.must_fail(format('SELECT public.settle_room_round(%L, %L)', v_room, v_game),
    'non-participant refused');

  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'pot')::int, 0, 'there is no pot');
  PERFORM pg_temp.must_equal((v_res->>'paid')::int, 200, 'first place is paid 200');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1200, 'by the house');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 1000, 'and second place loses nothing');

  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(v_res->>'reason', 'already_settled', 'a second call is a no-op');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1200, 'and moves no coins');
  PERFORM pg_temp.must_equal(jsonb_array_length(v_res->'deltas'), 1, 'but still reports the prize');

  -- ── four players: 200 / 100 / 50 / 0 ────────────────────────────────────
  UPDATE public.profiles SET coins = 1000 WHERE user_id IN (a, b, c, d);
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('NW0002', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 900), (v_room, b, 'b', false, 700),
         (v_room, c, 'c', false, 500), (v_room, d, 'd', false, 100);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(d);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 1200, 'first +200');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1100, 'second +100');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(c), 1050, 'third +50');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(d), 1000, 'fourth loses nothing');

  -- ── a tie at the top shares first and second ────────────────────────────
  UPDATE public.profiles SET coins = 1000 WHERE user_id IN (a, b, c);
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('NW0003', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 400), (v_room, b, 'b', false, 400), (v_room, c, 'c', false, 100);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(c);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 1150, 'tied first shares (200+100)/2');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1150, 'and so does the other');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(c), 1050, 'third still takes 50');

  -- ── a broke player sits down and plays for the prizes ───────────────────
  UPDATE public.profiles SET coins = 0 WHERE user_id = a;
  UPDATE public.profiles SET coins = 1000 WHERE user_id = b;
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('NW0004', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 900), (v_room, b, 'b', false, 100);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(b);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'players')::int, 2, 'no balance is needed to play');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 200, 'and a win from zero is paid');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1000, 'while the loser keeps every coin');

  -- ── invitations and the observing host are not players ──────────────────
  UPDATE public.profiles SET coins = 1000 WHERE user_id IN (a, b, c);
  INSERT INTO public.game_rooms (room_code, host_user_id, status, host_is_observer)
  VALUES ('NW0005', a, 'playing', true) RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 9999), (v_room, b, 'b', false, 300);
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, score)
  VALUES (v_room, c, 'c', false, 'invited', 5000);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(b);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(v_res->>'reason', 'practice', 'one real player is practice');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a) + pg_temp.coins_of(b) + pg_temp.coins_of(c), 3000,
    'and practice moves nothing');

  -- ── the daily ceiling bounds the mint ───────────────────────────────────
  UPDATE public.profiles SET coins = 1000 WHERE user_id IN (a, b);
  DELETE FROM public.currency_grants WHERE user_id = b AND kind = 'room_prize';
  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (b, 'room_prize', 19900, 0, 'earlier-today');
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('NW0006', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 100), (v_room, b, 'b', false, 900);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1100, 'a prize past the day''s ceiling pays what fits');

  -- ── the ledger reads without settling ───────────────────────────────────
  PERFORM pg_temp.as_user(b);
  v_led := public.room_round_ledger(v_game);
  PERFORM pg_temp.must_equal((v_led->>'settled')::boolean, true, 'a settled round reads settled');
  PERFORM pg_temp.must_equal(COALESCE((v_led->>'pot')::int, 0), 0, 'with no pot');

  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('NW0007', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 100), (v_room, b, 'b', false, 900);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  UPDATE public.profiles SET coins = 1000 WHERE user_id IN (a, b);
  v_led := public.room_round_ledger(v_game);
  PERFORM pg_temp.must_equal((v_led->>'settled')::boolean, false, 'an unsettled round reads unsettled');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a) + pg_temp.coins_of(b), 2000, 'and reading it moved nothing');

  -- ── complete_room_round records the seated only ─────────────────────────
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, score)
  VALUES (v_room, c, 'c', false, 'invited', 0);
  PERFORM pg_temp.as_user(a);
  PERFORM public.complete_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(
    (SELECT COALESCE(total_rounds_played, 0) FROM public.room_participants WHERE room_id = v_room AND user_id = c), 0,
    'an invitation nobody accepted played no round');
  PERFORM pg_temp.must_equal(
    (SELECT winner_user_id FROM public.room_games WHERE id = v_game), b,
    'the winner is the seated best');

  -- ── and in all of it, not one debit ─────────────────────────────────────
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::integer FROM public.currency_grants
      WHERE user_id::text LIKE '26000000-%' AND coins < 0), 0,
    'no room round ever wrote a debit');
END $$;

-- ── the daily reward is a calendar ──────────────────────────────────────────

INSERT INTO auth.users (id, email) VALUES
  ('26000000-0000-0000-0000-0000000000d1','daily-1@test'),
  ('26000000-0000-0000-0000-0000000000d3','daily-3@test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('26000000-0000-0000-0000-0000000000d1','d1', 0, 0),
  ('26000000-0000-0000-0000-0000000000d3','d3', 0, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 0, gems = 0;
DELETE FROM public.user_daily_rewards WHERE user_id::text LIKE '26000000-0000-0000-0000-0000000000d%';
DELETE FROM public.user_power_ups WHERE user_id::text LIKE '26000000-0000-0000-0000-0000000000d%';
INSERT INTO public.user_daily_rewards (user_id, reward_date, streak_count, daily_claimed)
VALUES ('26000000-0000-0000-0000-0000000000d3', CURRENT_DATE - 1, 2, true);

DO $$
DECLARE r record; i integer;
BEGIN
  -- Day one, ten times over on ten fresh days, pays the same every time.
  PERFORM pg_temp.as_user('26000000-0000-0000-0000-0000000000d1');
  SELECT * INTO r FROM public.claim_daily_reward();
  PERFORM pg_temp.must_equal(r.coins_awarded, 50, 'day one pays 50 coins');
  PERFORM pg_temp.must_equal(r.power_up, 'replace', 'and a replace');
  PERFORM pg_temp.must_equal(r.power_up_count, 1, 'exactly one');
  FOR i IN 1..10 LOOP
    DELETE FROM public.user_daily_rewards WHERE user_id = '26000000-0000-0000-0000-0000000000d1';
    SELECT * INTO r FROM public.claim_daily_reward();
    IF r.coins_awarded <> 50 OR r.gems_awarded <> 0 OR r.power_up IS DISTINCT FROM 'replace' THEN
      RAISE EXCEPTION 'ASSERTION FAILED: day one paid % coins, % gems, % on try %',
        r.coins_awarded, r.gems_awarded, r.power_up, i;
    END IF;
  END LOOP;
  RAISE NOTICE 'ok: day one never varies';

  PERFORM pg_temp.as_user('26000000-0000-0000-0000-0000000000d3');
  SELECT * INTO r FROM public.claim_daily_reward();
  PERFORM pg_temp.must_equal(r.streak, 3, 'a third day in a row');
  PERFORM pg_temp.must_equal(r.coins_awarded, 100, 'pays 100 coins');
  PERFORM pg_temp.must_equal(r.gems_awarded, 1, 'and one gem');
  PERFORM pg_temp.must_equal(r.bonus, 'gems', 'as its named bonus');
END $$;

DO $$
BEGIN
  IF (SELECT prosrc FROM pg_proc WHERE proname = 'claim_daily_reward') ILIKE '%random(%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED: claim_daily_reward still rolls random()';
  END IF;
  RAISE NOTICE 'ok: nothing in the daily reward is rolled';
END $$;
