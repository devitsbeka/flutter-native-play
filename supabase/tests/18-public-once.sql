-- A public room is public once, executed rather than reviewed.
--
-- What this pins down: the first claimed round of a public room turns it
-- private — on whichever participant's device claims it — and a private
-- room is left exactly as it was; a second claim of the same round does
-- nothing; and the Public tab's listing no longer names the room.
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

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

DO $$
DECLARE
  v_host   uuid := 'ee000000-0000-0000-0000-00000000000a';
  v_friend uuid := 'ee000000-0000-0000-0000-00000000000b';
  v_pub    uuid;
  v_priv   uuid;
  v_game   uuid;
  v_pgame  uuid;
  listed   text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host,   'host@once.test'),
    (v_friend, 'friend@once.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'Host'), (v_friend, 'Friend')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  DELETE FROM public.game_rooms WHERE host_user_id = v_host;

  INSERT INTO public.game_rooms (room_code, host_user_id, room_name, status, is_public)
  VALUES ('ONCE01', v_host, 'The listed one', 'playing', true)
  RETURNING id INTO v_pub;
  INSERT INTO public.game_rooms (room_code, host_user_id, room_name, status, is_public)
  VALUES ('ONCE02', v_host, 'The quiet one', 'playing', false)
  RETURNING id INTO v_priv;

  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, score)
  VALUES (v_pub,  v_host,   'Host',   true,  120),
         (v_pub,  v_friend, 'Friend', false, 275),
         (v_priv, v_host,   'Host',   true,  120),
         (v_priv, v_friend, 'Friend', false, 275);

  INSERT INTO public.room_games (room_id, game_number) VALUES (v_pub, 1)  RETURNING id INTO v_game;
  INSERT INTO public.room_games (room_id, game_number) VALUES (v_priv, 1) RETURNING id INTO v_pgame;

  -- Before any play the public room is listed.
  PERFORM pg_temp.as_user(v_friend);
  SELECT string_agg(l.room_code, ',' ORDER BY l.room_code) INTO listed
    FROM public.public_rooms(100) l WHERE l.host_user_id = v_host;
  PERFORM pg_temp.must_equal(listed, 'ONCE01', 'a public room that has not played is on the Public tab');

  -- The FRIEND claims the round, not the host: the flip must not depend on
  -- whose device saw the round end.
  PERFORM pg_temp.must_equal(public.complete_room_round(v_pub, v_game), true, 'the friend claims the first round');
  PERFORM pg_temp.must_equal(
    (SELECT is_public FROM public.game_rooms WHERE id = v_pub), false,
    'the public room is private the moment its first round is claimed');

  -- The private room's round leaves it exactly as it was.
  PERFORM pg_temp.must_equal(public.complete_room_round(v_priv, v_pgame), true, 'the private room plays its round');
  PERFORM pg_temp.must_equal(
    (SELECT is_public FROM public.game_rooms WHERE id = v_priv), false,
    'a private room stays private');

  -- A second claim of the same round is the no-op it always was.
  PERFORM pg_temp.as_user(v_host);
  PERFORM pg_temp.must_equal(public.complete_room_round(v_pub, v_game), false, 'a second claim does nothing');

  -- And the Public tab no longer names the room.
  SELECT string_agg(l.room_code, ',' ORDER BY l.room_code) INTO listed
    FROM public.public_rooms(100) l WHERE l.host_user_id = v_host;
  PERFORM pg_temp.must_equal(listed, NULL::text, 'a played public room is off the Public tab for good');

  -- The room itself is still there for its players: not cancelled, not
  -- archived — theirs to keep playing in.
  PERFORM pg_temp.must_equal(
    (SELECT status::text = 'cancelled' OR is_archived IS TRUE FROM public.game_rooms WHERE id = v_pub), false,
    'a played public room is kept, as a private one');

  DELETE FROM public.game_rooms WHERE host_user_id = v_host;
END $$;
