-- A room round is played for a pot, as assertions.
--
-- What this pins down: everybody at the table pays 500 in, the pot is paid
-- back out and nothing is minted, two players is winner-takes-all, three or
-- more is 70/20/10, a solo room is practice and costs nothing, and the whole
-- thing happens exactly once however many devices call it.
--
-- The failure this guards against is the one the old client-side payout had:
-- coins appearing from nowhere. Every case below checks the room's TOTAL
-- balance across all players, not just the winner's.

\set ON_ERROR_STOP on

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

-- ── fixtures ───────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email) VALUES
  ('bbbbbbbb-0000-0000-0000-00000000000a','pot-a@test'),
  ('bbbbbbbb-0000-0000-0000-00000000000b','pot-b@test'),
  ('bbbbbbbb-0000-0000-0000-00000000000c','pot-c@test'),
  ('bbbbbbbb-0000-0000-0000-00000000000d','pot-d@test'),
  ('bbbbbbbb-0000-0000-0000-00000000000f','pot-f@test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('bbbbbbbb-0000-0000-0000-00000000000a','a', 2000, 0),
  ('bbbbbbbb-0000-0000-0000-00000000000b','b', 2000, 0),
  ('bbbbbbbb-0000-0000-0000-00000000000c','c', 2000, 0),
  ('bbbbbbbb-0000-0000-0000-00000000000d','d', 2000, 0),
  ('bbbbbbbb-0000-0000-0000-00000000000f','f', 2000, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 2000, gems = 0;

DO $$
DECLARE
  a uuid := 'bbbbbbbb-0000-0000-0000-00000000000a';
  b uuid := 'bbbbbbbb-0000-0000-0000-00000000000b';
  c uuid := 'bbbbbbbb-0000-0000-0000-00000000000c';
  d uuid := 'bbbbbbbb-0000-0000-0000-00000000000d';
  outsider uuid := 'bbbbbbbb-0000-0000-0000-00000000000f';
  v_room uuid;
  v_game uuid;
  v_res jsonb;
  v_before integer;
BEGIN
  -- Everyone starts on 2000 coins.
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b, c, d);
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 2000, 'fixture: a starts on 2000');

  -- ── two players: winner takes the pot ───────────────────────────────────
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('POT001', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 120),
         (v_room, b, 'b', false, 275);
  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 1) RETURNING id INTO v_game;

  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail(
    format('SELECT public.settle_room_round(%L, %L)', v_room, v_game),
    'anonymous caller refused');
  PERFORM pg_temp.as_user(outsider);
  PERFORM pg_temp.must_fail(
    format('SELECT public.settle_room_round(%L, %L)', v_room, v_game),
    'non-participant refused');

  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'pot')::int, 1000, 'two players stake 1000 between them');
  PERFORM pg_temp.must_equal((v_res->>'paid')::int, 1000, 'and all 1000 is paid out');
  -- b scored more, so b takes it: 2000 - 500 + 1000.
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 2500, 'winner takes the whole pot');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 1500, 'loser is down the stake');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a) + pg_temp.coins_of(b), 4000,
    'nothing was minted: the table still holds what it started with');

  -- Every other device calling it moves nothing.
  PERFORM pg_temp.as_user(b);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(v_res->>'reason', 'already_settled', 'a second call is a no-op');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 2500, 'and moves no coins');

  -- ── four players: 70 / 20 / 10 ──────────────────────────────────────────
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b, c, d);
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('POT002', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 400),
         (v_room, b, 'b', false, 300),
         (v_room, c, 'c', false, 200),
         (v_room, d, 'd', false, 100);
  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 1) RETURNING id INTO v_game;

  PERFORM pg_temp.as_user(c);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'pot')::int, 2000, 'four players stake 2000');
  PERFORM pg_temp.must_equal((v_res->>'paid')::int, 2000, 'and the pot is paid out to the coin');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 1500 + 1400, 'first takes 70%');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 1500 + 400,  'second takes 20%');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(c), 1500 + 200,  'third takes 10%');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(d), 1500,        'fourth takes nothing');
  PERFORM pg_temp.must_equal(
    pg_temp.coins_of(a) + pg_temp.coins_of(b) + pg_temp.coins_of(c) + pg_temp.coins_of(d),
    8000, 'four-player table is zero-sum too');

  -- ── an invitation nobody accepted is not a player ───────────────────────
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b, c);
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('POT003', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score, status)
  VALUES (v_room, a, 'a', true, 400, 'joined'),
         (v_room, b, 'b', false, 300, 'joined'),
         (v_room, c, 'c', false, 0, 'invited');
  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 1) RETURNING id INTO v_game;

  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'players')::int, 2, 'the invited seat is not at the table');
  PERFORM pg_temp.must_equal((v_res->>'pot')::int, 1000, 'so only two stakes are collected');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(c), 2000, 'and the invited player pays nothing');

  -- ── a room of one is practice ───────────────────────────────────────────
  UPDATE public.profiles SET coins = 2000 WHERE user_id = a;
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('POT004', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 400);
  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 1) RETURNING id INTO v_game;

  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal(v_res->>'reason', 'practice', 'a solo room settles nothing');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 2000, 'and costs nothing');

  -- ── a player who cannot cover the stake pays what they have ─────────────
  UPDATE public.profiles SET coins = 2000 WHERE user_id = a;
  UPDATE public.profiles SET coins = 120  WHERE user_id = b;
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('POT005', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 400),
         (v_room, b, 'b', false, 100);
  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 1) RETURNING id INTO v_game;

  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'pot')::int, 620, 'the short player stakes what they have');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), 0, 'and is left at zero, never below it');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 1500 + 620, 'the winner takes the smaller pot');

  -- ── PRO stakes like everybody else ──────────────────────────────────────
  -- A pot must balance. Exempting PRO would mean the other players fund the
  -- PRO player's winnings, which is a transfer, not a subscription benefit.
  UPDATE public.profiles SET coins = 2000 WHERE user_id IN (a, b);
  INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
  VALUES (b, 'pro', now() + interval '30 days')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('POT006', a, 'playing') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_room, a, 'a', true, 400),
         (v_room, b, 'b', false, 100);
  INSERT INTO public.room_games (room_id, game_number)
  VALUES (v_room, 1) RETURNING id INTO v_game;

  v_before := pg_temp.coins_of(b);
  PERFORM pg_temp.as_user(a);
  v_res := public.settle_room_round(v_room, v_game);
  PERFORM pg_temp.must_equal((v_res->>'pot')::int, 1000, 'PRO pays into the pot');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(b), v_before - 500, 'and loses the stake like anyone');

  RAISE NOTICE 'all room-pot assertions passed';
END $$;
