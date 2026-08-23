-- Invite links: the code is the host's half of the introduction.
--
-- What these assert, in the order the flow happens:
--   * a host gets one code and keeps it
--   * a stranger holding the code can see who is inviting them, and to what,
--     without an account
--   * accepting makes exactly one accepted friendship, both directions
--   * accepting twice, or accepting when a request was already pending, does
--     not make a second one
--   * a code nobody minted buys nothing
--   * a client cannot write its own code, which is what stops the link from
--     being guessable

\set ON_ERROR_STOP on
\set QUIET 1
SET client_min_messages TO WARNING;

BEGIN;

-- ── fixtures ──────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES
  ('aaaa1111-0000-0000-0000-000000000001', 'host@example.com'),
  ('bbbb2222-0000-0000-0000-000000000002', 'guest@example.com'),
  ('cccc3333-0000-0000-0000-000000000003', 'other@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (user_id, nickname, avatar_url, country_code) VALUES
  ('aaaa1111-0000-0000-0000-000000000001', 'Beka',  'https://img/beka.png', 'GE'),
  ('bbbb2222-0000-0000-0000-000000000002', 'Marta', NULL, 'US'),
  ('cccc3333-0000-0000-0000-000000000003', 'Nato',  NULL, 'GE')
ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

INSERT INTO public.game_rooms
  (id, room_code, host_user_id, status, category_id, category_name, room_name)
VALUES
  ('dddd4444-0000-0000-0000-000000000004', 'ABC123',
   'aaaa1111-0000-0000-0000-000000000001', 'waiting',
   'guess_logo', 'Guess the Logo', 'Sunday night');

INSERT INTO public.room_participants (room_id, user_id, nickname) VALUES
  ('dddd4444-0000-0000-0000-000000000004', 'aaaa1111-0000-0000-0000-000000000001', 'Beka'),
  ('dddd4444-0000-0000-0000-000000000004', 'cccc3333-0000-0000-0000-000000000003', 'Nato');


-- ── 1. one code per host, and it does not change ──────────────────────────
SELECT set_config('test.uid', 'aaaa1111-0000-0000-0000-000000000001', false);

CREATE TEMP TABLE minted AS SELECT public.get_or_create_invite_code() AS code;

DO $$
DECLARE first_code text; second_code text;
BEGIN
  SELECT code INTO first_code FROM minted;
  second_code := public.get_or_create_invite_code();

  IF first_code IS NULL OR length(first_code) <> 16 THEN
    RAISE EXCEPTION 'expected a 16-character code, got %', first_code;
  END IF;
  IF second_code <> first_code THEN
    RAISE EXCEPTION 'code changed between calls: % then %', first_code, second_code;
  END IF;
  IF (SELECT count(*) FROM invite_links WHERE host_user_id = auth.uid()) <> 1 THEN
    RAISE EXCEPTION 'a second call created a second row';
  END IF;
END $$;


-- ── 2. a signed-out stranger can see who invited them ─────────────────────
SELECT set_config('test.uid', '', false);

DO $$
DECLARE p record; c text;
BEGIN
  SELECT code INTO c FROM minted;
  SELECT * INTO p FROM public.invite_preview(c);

  IF p.host_nickname <> 'Beka' THEN
    RAISE EXCEPTION 'preview named % rather than the host', p.host_nickname;
  END IF;
  IF p.room_code <> 'ABC123' OR p.category_name <> 'Guess the Logo' THEN
    RAISE EXCEPTION 'preview lost the room: % / %', p.room_code, p.category_name;
  END IF;
  IF p.room_name <> 'Sunday night' OR p.player_count <> 2 THEN
    RAISE EXCEPTION 'preview lost the room details: % / %', p.room_name, p.player_count;
  END IF;
  IF (SELECT count(*) FROM public.invite_room_players(c)) <> 2 THEN
    RAISE EXCEPTION 'expected two players in the room';
  END IF;
  IF NOT (SELECT is_host FROM public.invite_room_players(c) LIMIT 1) THEN
    RAISE EXCEPTION 'the host should be listed first and flagged as host';
  END IF;
END $$;


-- ── 3. a game already under way is not offered as a seat ──────────────────
UPDATE public.game_rooms SET status = 'playing'
WHERE id = 'dddd4444-0000-0000-0000-000000000004';

DO $$
DECLARE p record; c text;
BEGIN
  SELECT code INTO c FROM minted;
  SELECT * INTO p FROM public.invite_preview(c);
  IF p.host_nickname <> 'Beka' THEN
    RAISE EXCEPTION 'the host must still be shown when there is no joinable room';
  END IF;
  IF p.room_code IS NOT NULL THEN
    RAISE EXCEPTION 'a room mid-game was offered as joinable';
  END IF;
END $$;

UPDATE public.game_rooms SET status = 'waiting'
WHERE id = 'dddd4444-0000-0000-0000-000000000004';


-- ── 3b. a player who is not the host resolves the same room ──────────────
--
-- Anyone in a lobby can share their own link. If the room were looked up by
-- who hosts it, Nato's link would find no room at all and their guest would
-- be invited to nothing.
SELECT set_config('test.uid', 'cccc3333-0000-0000-0000-000000000003', false);

DO $$
DECLARE nato_code text; p record;
BEGIN
  nato_code := public.get_or_create_invite_code();
  SELECT * INTO p FROM public.invite_preview(nato_code);
  IF p.room_code <> 'ABC123' THEN
    RAISE EXCEPTION 'a non-host player''s link did not resolve their room (got %)', p.room_code;
  END IF;
  IF p.host_nickname <> 'Nato' THEN
    RAISE EXCEPTION 'the preview should name the sender, not the room host';
  END IF;
  -- The host flag still belongs to whoever hosts the room.
  IF (SELECT nickname FROM public.invite_room_players(nato_code) WHERE is_host) <> 'Beka' THEN
    RAISE EXCEPTION 'the host flag followed the sender instead of the room host';
  END IF;
END $$;


-- ── 4. accepting makes one accepted friendship ────────────────────────────
SELECT set_config('test.uid', 'bbbb2222-0000-0000-0000-000000000002', false);

DO $$
DECLARE c text; returned uuid;
BEGIN
  SELECT code INTO c FROM minted;
  returned := public.accept_invite(c);

  IF returned <> 'aaaa1111-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'accept_invite returned % rather than the host', returned;
  END IF;
  IF (SELECT count(*) FROM friendships
      WHERE status = 'accepted'
        AND ((user_id = 'bbbb2222-0000-0000-0000-000000000002' AND friend_id = 'aaaa1111-0000-0000-0000-000000000001')
          OR (user_id = 'aaaa1111-0000-0000-0000-000000000001' AND friend_id = 'bbbb2222-0000-0000-0000-000000000002')))
     <> 1 THEN
    RAISE EXCEPTION 'expected exactly one accepted friendship';
  END IF;

  -- Twice is once. The friends list reads both directions, so a second row
  -- would show the same person twice.
  PERFORM public.accept_invite(c);
  IF (SELECT count(*) FROM friendships
      WHERE (user_id = 'bbbb2222-0000-0000-0000-000000000002' AND friend_id = 'aaaa1111-0000-0000-0000-000000000001')
         OR (user_id = 'aaaa1111-0000-0000-0000-000000000001' AND friend_id = 'bbbb2222-0000-0000-0000-000000000002'))
     <> 1 THEN
    RAISE EXCEPTION 'accepting twice made a second friendship';
  END IF;
END $$;


-- ── 5. a pending request in the other direction is promoted, not doubled ──
INSERT INTO public.friendships (user_id, friend_id, status)
VALUES ('aaaa1111-0000-0000-0000-000000000001', 'cccc3333-0000-0000-0000-000000000003', 'pending');

SELECT set_config('test.uid', 'cccc3333-0000-0000-0000-000000000003', false);

DO $$
DECLARE c text;
BEGIN
  SELECT code INTO c FROM minted;
  PERFORM public.accept_invite(c);

  IF (SELECT count(*) FROM friendships
      WHERE (user_id = 'aaaa1111-0000-0000-0000-000000000001' AND friend_id = 'cccc3333-0000-0000-0000-000000000003')
         OR (user_id = 'cccc3333-0000-0000-0000-000000000003' AND friend_id = 'aaaa1111-0000-0000-0000-000000000001'))
     <> 1 THEN
    RAISE EXCEPTION 'the pending request was duplicated instead of promoted';
  END IF;
  IF (SELECT status FROM friendships
      WHERE user_id = 'aaaa1111-0000-0000-0000-000000000001'
        AND friend_id = 'cccc3333-0000-0000-0000-000000000003')::text <> 'accepted' THEN
    RAISE EXCEPTION 'the pending request was not promoted to accepted';
  END IF;
END $$;


-- ── 6. opening your own link makes no friendship ──────────────────────────
SELECT set_config('test.uid', 'aaaa1111-0000-0000-0000-000000000001', false);

DO $$
DECLARE c text; before_count integer; after_count integer;
BEGIN
  SELECT code INTO c FROM minted;
  SELECT count(*) INTO before_count FROM friendships;
  PERFORM public.accept_invite(c);
  SELECT count(*) INTO after_count FROM friendships;
  IF after_count <> before_count THEN
    RAISE EXCEPTION 'a host befriended themselves';
  END IF;
END $$;


-- ── 7. a code nobody minted buys nothing ──────────────────────────────────
SELECT set_config('test.uid', 'bbbb2222-0000-0000-0000-000000000002', false);

DO $$
DECLARE raised boolean := false;
BEGIN
  BEGIN
    PERFORM public.accept_invite('nosuchcodeatall');
  EXCEPTION WHEN OTHERS THEN
    raised := true;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'an unknown code was accepted';
  END IF;
  IF (SELECT count(*) FROM public.invite_preview('nosuchcodeatall')) <> 0 THEN
    RAISE EXCEPTION 'an unknown code previewed something';
  END IF;
END $$;


-- ── 8. the table takes no writes from clients ─────────────────────────────
--
-- A client that could choose its own code could choose a short one, and the
-- whole scheme rests on the code being unguessable.
DO $$
DECLARE ins integer; upd integer;
BEGIN
  SELECT count(*) INTO ins FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'invite_links' AND cmd = 'INSERT';
  SELECT count(*) INTO upd FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'invite_links' AND cmd = 'UPDATE';
  IF ins <> 0 OR upd <> 0 THEN
    RAISE EXCEPTION 'invite_links has a client write policy (% insert, % update)', ins, upd;
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.invite_links'::regclass) THEN
    RAISE EXCEPTION 'invite_links has RLS disabled';
  END IF;
END $$;


-- ── 8b. a link that only knows a room code ───────────────────────────────
--
-- Every invite shared before /i/ existed is /room/<code>, and those links are
-- out in the world. They land on the same welcome screen, resolved this way.
SELECT set_config('test.uid', '', false);

DO $$
DECLARE p record;
BEGIN
  -- Case-insensitive: the code is printed uppercase in the lobby and typed
  -- back in however the keyboard felt.
  SELECT * INTO p FROM public.room_preview('abc123');
  IF p.host_nickname <> 'Beka' OR p.room_code <> 'ABC123' THEN
    RAISE EXCEPTION 'room_preview did not resolve a lowercased code';
  END IF;
  IF p.category_name <> 'Guess the Logo' OR p.player_count <> 2 THEN
    RAISE EXCEPTION 'room_preview lost the room details';
  END IF;
  IF (SELECT count(*) FROM public.room_players('ABC123')) <> 2 THEN
    RAISE EXCEPTION 'expected two players by room code';
  END IF;
  IF (SELECT nickname FROM public.room_players('ABC123') WHERE is_host) <> 'Beka' THEN
    RAISE EXCEPTION 'the host flag is wrong on the room-code path';
  END IF;
  IF (SELECT count(*) FROM public.room_preview('nosuch')) <> 0 THEN
    RAISE EXCEPTION 'an unknown room code previewed something';
  END IF;
END $$;


-- ── 9. the functions are not granted to the world ─────────────────────────
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.proname, ', ') INTO bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('get_or_create_invite_code', 'accept_invite')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'granted to PUBLIC: %', bad;
  END IF;
END $$;

ROLLBACK;

\echo 'invite links: all assertions passed'
