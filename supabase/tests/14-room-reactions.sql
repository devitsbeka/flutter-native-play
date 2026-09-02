-- Icons sent between players during a match (20260927100000).
--
-- Who may send, to whom, and who may read — executed against a real
-- Postgres with the shim's auth.uid() in place. Run after 00-supabase-shim
-- and the migrations, like the other suites.

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RAISE EXCEPTION 'FAIL: % — expected an error', label;
EXCEPTION
  WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    RAISE NOTICE 'ok: %', label;
  WHEN OTHERS THEN
    RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAIL: % — got %, want %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

GRANT SELECT, INSERT ON public.room_reactions TO authenticated;
GRANT SELECT ON public.room_participants TO authenticated;

DO $$
DECLARE
  v_host uuid := 'ee000000-0000-0000-0000-00000000001a';
  v_mate uuid := 'ee000000-0000-0000-0000-00000000001b';
  v_out  uuid := 'ee000000-0000-0000-0000-00000000001c';
  v_room uuid;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'rxhost@rx.test'), (v_mate, 'rxmate@rx.test'), (v_out, 'rxout@rx.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES
    (v_host, 'RxHost'), (v_mate, 'RxMate'), (v_out, 'RxOut')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.game_rooms (room_code, host_user_id, status, game_type_key)
  VALUES ('RXROOM', v_host, 'playing', 'team_battle') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, team)
  VALUES (v_room, v_host, 'RxHost', true,  'playing', 'a'),
         (v_room, v_mate, 'RxMate', false, 'playing', 'a');

  SET LOCAL ROLE authenticated;

  -- A seated player sends a seated player an icon.
  PERFORM pg_temp.as_user(v_mate);
  INSERT INTO public.room_reactions (room_id, from_user_id, to_user_id, icon)
  VALUES (v_room, v_mate, v_host, 'https://icons/cheer.png');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_reactions WHERE room_id = v_room), 1,
    'a seated player sends an icon');

  -- Not in somebody else's name, not to yourself, not to somebody outside.
  PERFORM pg_temp.must_fail(format(
    'INSERT INTO public.room_reactions (room_id, from_user_id, to_user_id, icon) VALUES (%L, %L, %L, %L)',
    v_room, v_host, v_mate, 'https://icons/x.png'), 'the sender is always the caller');
  PERFORM pg_temp.must_fail(format(
    'INSERT INTO public.room_reactions (room_id, from_user_id, to_user_id, icon) VALUES (%L, %L, %L, %L)',
    v_room, v_mate, v_mate, 'https://icons/x.png'), 'nobody sends themselves an icon');
  PERFORM pg_temp.must_fail(format(
    'INSERT INTO public.room_reactions (room_id, from_user_id, to_user_id, icon) VALUES (%L, %L, %L, %L)',
    v_room, v_mate, v_out, 'https://icons/x.png'), 'the recipient has to be seated');

  -- A stranger neither sends nor reads.
  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(format(
    'INSERT INTO public.room_reactions (room_id, from_user_id, to_user_id, icon) VALUES (%L, %L, %L, %L)',
    v_room, v_out, v_host, 'https://icons/x.png'), 'a stranger cannot send into the room');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_reactions WHERE room_id = v_room), 0,
    'a stranger reads nothing');

  -- The recipient reads what came in.
  PERFORM pg_temp.as_user(v_host);
  PERFORM pg_temp.must_equal(
    (SELECT icon FROM public.room_reactions WHERE room_id = v_room AND to_user_id = v_host),
    'https://icons/cheer.png', 'the recipient reads their icon');

  RESET ROLE;
  PERFORM pg_temp.as_user(NULL);
END $$;

\echo 'ok: icons travel between seated players and nobody else'
