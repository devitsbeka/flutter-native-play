-- The pot is honest, executed rather than reviewed (20261106110000).
--
-- Same harness as 15-room-pot.sql (see README.md).

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

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

CREATE OR REPLACE FUNCTION pg_temp.coins_of(u uuid) RETURNS integer
LANGUAGE sql AS $$ SELECT coins FROM public.profiles WHERE user_id = u; $$;

INSERT INTO auth.users (id, email) VALUES
  ('23000000-0000-0000-0000-00000000000a','hp-a@test'),
  ('23000000-0000-0000-0000-00000000000b','hp-b@test'),
  ('23000000-0000-0000-0000-00000000000c','hp-c@test'),
  ('23000000-0000-0000-0000-00000000000d','hp-d@test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('23000000-0000-0000-0000-00000000000a','a', 2000, 0),
  ('23000000-0000-0000-0000-00000000000b','b', 2000, 0),
  ('23000000-0000-0000-0000-00000000000c','c', 2000, 0),
  ('23000000-0000-0000-0000-00000000000d','d', 2000, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 2000, gems = 0;
DELETE FROM public.game_rooms WHERE host_user_id = '23000000-0000-0000-0000-00000000000a';
DELETE FROM public.currency_grants WHERE user_id IN (
  '23000000-0000-0000-0000-00000000000a', '23000000-0000-0000-0000-00000000000b',
  '23000000-0000-0000-0000-00000000000c', '23000000-0000-0000-0000-00000000000d');

DO $$
DECLARE
  a uuid := '23000000-0000-0000-0000-00000000000a';
  b uuid := '23000000-0000-0000-0000-00000000000b';
  c uuid := '23000000-0000-0000-0000-00000000000c';
  d uuid := '23000000-0000-0000-0000-00000000000d';
  v_room uuid;
  v_game uuid;
  v_res jsonb;
  v_led jsonb;
BEGIN
  -- ── a zero-coin seat cannot take the pot ────────────────────────────────
  -- Three at the table, one broke: the two who can stake play for the pot,
  -- the broke one plays for practice however well they score.
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b);
  UPDATE public.profiles SET coins = 0    WHERE user_id = c;
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('HP0001', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 300), (v_room, b, 'b', false, 200), (v_room, c, 'c', false, 900);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;

  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'players')::int, 2, 'two seats are at the table for money');
  PERFORM pg_temp.must_equal((v_res->>'pot')::int, 1000, 'they stake 1000 between them');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(c), 0, 'the broke seat pays nothing');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 2500, 'and the best of the two who staked takes the pot');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1500, 'the other is down the stake');

  -- ── a tie at two players is half each ───────────────────────────────────
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b);
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('HP0002', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 500), (v_room, b, 'b', false, 500);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(b);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'paid')::int, 1000, 'the whole pot is paid');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 2000, 'a draw costs the host nothing');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 2000, 'and the guest nothing');

  -- ── a tie at the top of four shares first and second ────────────────────
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b, c, d);
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('HP0003', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score, joined_at)
  VALUES (v_room, a, 'a', true, 400, now() - interval '4 minutes'),
         (v_room, b, 'b', false, 400, now() - interval '3 minutes'),
         (v_room, c, 'c', false, 300, now() - interval '2 minutes'),
         (v_room, d, 'd', false, 100, now() - interval '1 minute');
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(c);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'pot')::int, 2000, 'four stake 2000');
  PERFORM pg_temp.must_equal((v_res->>'paid')::int, 2000, 'and 2000 is paid out to the coin');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 1500 + 900, 'tied first shares (70+20)/2 = 45%');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1500 + 900, 'and so does the other');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(c), 1500 + 200, 'third still takes 10%');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(d), 1500, 'fourth takes nothing');

  -- ── the observing host is not at the table ──────────────────────────────
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b, c);
  INSERT INTO public.game_rooms (room_code, host_user_id, status, host_is_observer)
  VALUES ('HP0004', a, 'playing', true) RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 9999), (v_room, b, 'b', false, 300), (v_room, c, 'c', false, 100);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(b);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'players')::int, 2, 'the observer is not counted');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 2000, 'stakes nothing and wins nothing');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 2500, 'the best answerer takes the pot');

  -- ── the ceiling never burns a pot ───────────────────────────────────────
  -- b has already netted the day's room ceiling; b still gets paid in full.
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b);
  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (b, 'room_prize', 20000, 0, 'earlier-today');
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('HP0005', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 100), (v_room, b, 'b', false, 900);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'paid')::int, 1000, 'every coin collected is paid out');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 2500, 'the winner is paid whatever their day''s total');

  -- ── the ledger can be read without settling ─────────────────────────────
  PERFORM pg_temp.as_user(b);
  v_led := public.room_round_ledger(v_game);
  PERFORM pg_temp.must_equal((v_led->>'settled')::boolean, true, 'a settled round reads settled');
  PERFORM pg_temp.must_equal((v_led->>'pot')::int, 1000, 'with its pot');

  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('HP0006', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 100), (v_room, b, 'b', false, 900);
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_room, 1) RETURNING id INTO v_game;
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b);
  v_led := public.room_round_ledger(v_game);
  PERFORM pg_temp.must_equal((v_led->>'settled')::boolean, false, 'an unsettled round reads unsettled');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a) + pg_temp.coins_of(b), 4000, 'and reading it moved nothing');
  PERFORM pg_temp.must_equal(
    (SELECT stakes_applied FROM public.room_games WHERE id = v_game), false,
    'nor claimed it');

  -- ── complete_room_round records the seated only ─────────────────────────
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, score)
  VALUES (v_room, c, 'c', false, 'invited', 0);
  PERFORM pg_temp.as_user(a);
  PERFORM public.complete_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(
    (SELECT COALESCE(total_rounds_played, 0) FROM public.room_participants WHERE room_id = v_room AND user_id = c), 0,
    'an invitation nobody accepted played no round');
  PERFORM pg_temp.must_equal(
    (SELECT COALESCE(total_rounds_played, 0) FROM public.room_participants WHERE room_id = v_room AND user_id = b), 1,
    'while a seated player played one');
  PERFORM pg_temp.must_equal(
    (SELECT winner_user_id FROM public.room_games WHERE id = v_game), b,
    'the winner is the seated best');
END $$;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.room_round_ledger(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can read ledgers';
  END IF;
  RAISE NOTICE 'ok: the ledger is for signed-in participants only';
END $$;
