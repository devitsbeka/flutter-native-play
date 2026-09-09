-- A public card can say what the whole room plays.
--
-- Tapping a room card opens every round in order, the questions per round
-- and what a seat costs. The client cannot read that for a room it has not
-- joined: room_category_queue's only SELECT policy is "Participants can
-- view queue". public_rooms is SECURITY DEFINER and answers for a room that
-- advertises itself, which is what these assertions are about — a STRANGER
-- being told, correctly and in order.
--
-- The two fallbacks matter as much as the list: a room with no queue plays
-- its own category as round one (so the card's "+N" is right), and a room
-- with nothing chosen returns an empty array rather than a null the card
-- would have to special-case.

\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, wanted %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

INSERT INTO auth.users (id, email) VALUES
  ('a1000000-0000-0000-0000-000000000001','host@x.com'),
  ('a1000000-0000-0000-0000-000000000002','stranger@x.com') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (user_id, nickname) VALUES
  ('a1000000-0000-0000-0000-000000000001','Host'),
  ('a1000000-0000-0000-0000-000000000002','Stranger') ON CONFLICT DO NOTHING;

INSERT INTO public.game_rooms (id, room_code, host_user_id, is_public, status, category_name, total_questions)
VALUES ('b1000000-0000-0000-0000-000000000001','RRR111','a1000000-0000-0000-0000-000000000001',
        true,'waiting','Science',10);
INSERT INTO public.room_participants (room_id, user_id, nickname, is_host)
VALUES ('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Host',true);
INSERT INTO public.room_category_queue (room_id, position, source_type, category_name, icon_slug) VALUES
  ('b1000000-0000-0000-0000-000000000001', 1, 'category', 'History', 'history'),
  ('b1000000-0000-0000-0000-000000000001', 2, 'category', 'Sports',  'sports'),
  ('b1000000-0000-0000-0000-000000000001', 3, 'random',    NULL,      NULL);

-- Read it as the STRANGER, who may not read room_category_queue at all.
SELECT set_config('test.uid','a1000000-0000-0000-0000-000000000002', false);

SELECT pg_temp.must_equal(
  (SELECT jsonb_array_length(rounds) FROM public.public_rooms(60)
    WHERE id = 'b1000000-0000-0000-0000-000000000001'),
  3, 'a stranger is told how many rounds a public room plays');

SELECT pg_temp.must_equal(
  (SELECT rounds -> 0 ->> 'name' FROM public.public_rooms(60)
    WHERE id = 'b1000000-0000-0000-0000-000000000001'),
  'History', 'in play order, round one first');

SELECT pg_temp.must_equal(
  (SELECT rounds -> 2 ->> 'source_type' FROM public.public_rooms(60)
    WHERE id = 'b1000000-0000-0000-0000-000000000001'),
  'random', 'and a random round says so rather than going missing');

SELECT pg_temp.must_equal(
  (SELECT total_questions FROM public.public_rooms(60)
    WHERE id = 'b1000000-0000-0000-0000-000000000001'),
  10, 'with the questions each round runs');

-- The table itself stays shut to them.
SELECT pg_temp.must_equal(
  (SELECT count(*)::integer FROM public.room_category_queue
    WHERE room_id = 'b1000000-0000-0000-0000-000000000001'),
  3, 'the queue table is readable here only because RLS is off for the owner');

-- A room with no queue falls back to its own category as round one.
INSERT INTO public.game_rooms (id, room_code, host_user_id, is_public, status, category_name, total_questions)
VALUES ('b1000000-0000-0000-0000-000000000002','RRR222','a1000000-0000-0000-0000-000000000001',
        true,'waiting','Movies',5);
INSERT INTO public.room_participants (room_id, user_id, nickname, is_host)
VALUES ('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','Host',true);
SELECT pg_temp.must_equal(
  (SELECT rounds -> 0 ->> 'name' FROM public.public_rooms(60)
    WHERE id = 'b1000000-0000-0000-0000-000000000002'),
  'Movies', 'a room with no queue plays its own category as round one');
SELECT pg_temp.must_equal(
  (SELECT jsonb_array_length(rounds) FROM public.public_rooms(60)
    WHERE id = 'b1000000-0000-0000-0000-000000000002'),
  1, 'and that is exactly one round, so the card shows no +N');

-- A room with nothing chosen says so with an empty list, not a null.
INSERT INTO public.game_rooms (id, room_code, host_user_id, is_public, status, total_questions)
VALUES ('b1000000-0000-0000-0000-000000000003','RRR333','a1000000-0000-0000-0000-000000000001',
        true,'waiting',5);
INSERT INTO public.room_participants (room_id, user_id, nickname, is_host)
VALUES ('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','Host',true);
SELECT pg_temp.must_equal(
  (SELECT jsonb_array_length(rounds) FROM public.public_rooms(60)
    WHERE id = 'b1000000-0000-0000-0000-000000000003'),
  0, 'a room with nothing picked yet returns an empty list, never null');

SELECT 'all public-room round assertions passed' AS result;
