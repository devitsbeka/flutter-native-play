-- Drafts live on the row, and a level-up is paid once.
--
-- Companion to 20261106120000_drafts_on_the_row.sql. Runs after every
-- migration, as pr-checks.yml does, against the test cluster that
-- 00-supabase-shim.sql prepared.

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

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ok: % (%)', label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'ASSERTION FAILED: % — it succeeded', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

CREATE OR REPLACE FUNCTION pg_temp.coins_of(u uuid) RETURNS integer
LANGUAGE sql AS $$ SELECT coins FROM public.profiles WHERE user_id = u; $$;

INSERT INTO auth.users (id, email) VALUES
  ('24000000-0000-0000-0000-00000000000a','dr-a@test'),
  ('24000000-0000-0000-0000-00000000000b','dr-b@test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('24000000-0000-0000-0000-00000000000a','a', 5000, 0),
  ('24000000-0000-0000-0000-00000000000b','b', 5000, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 5000, gems = 0;
DELETE FROM public.game_rooms WHERE host_user_id = '24000000-0000-0000-0000-00000000000a';
DELETE FROM public.currency_grants WHERE user_id IN (
  '24000000-0000-0000-0000-00000000000a', '24000000-0000-0000-0000-00000000000b');

-- ── the columns ─────────────────────────────────────────────────────────────

SELECT pg_temp.must_equal(
  (SELECT data_type || ':' || is_nullable || ':' || column_default
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_rooms' AND column_name = 'is_draft'),
  'boolean:NO:false', 'is_draft exists: boolean, not null, default false');
SELECT pg_temp.must_equal(
  (SELECT data_type || ':' || is_nullable || ':' || column_default
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_rooms' AND column_name = 'draft_public'),
  'boolean:NO:false', 'draft_public exists: boolean, not null, default false');

DO $$
DECLARE
  a uuid := '24000000-0000-0000-0000-00000000000a';
  b uuid := '24000000-0000-0000-0000-00000000000b';
  v_room uuid;
BEGIN
  -- A room made the old way is not a draft; "+ Room" says so on the insert.
  INSERT INTO public.game_rooms (room_code, host_user_id, status)
  VALUES ('DRFT01', a, 'waiting') RETURNING id INTO v_room;
  PERFORM pg_temp.must_equal((SELECT is_draft FROM public.game_rooms WHERE id = v_room), false,
    'a plain insert is not a draft');
  UPDATE public.game_rooms SET is_draft = true, draft_public = true WHERE id = v_room;

  -- The host settles their own draft (game_rooms UPDATE is the host's by
  -- the existing policy; this harness runs as the owner, so that policy is
  -- not what is proved here - the column round-trip is).
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host)
  VALUES (v_room, a, 'a', true), (v_room, b, 'b', false);
  PERFORM pg_temp.as_user(a);
  UPDATE public.game_rooms SET is_draft = false, is_public = true WHERE id = v_room;
  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_equal(
    (SELECT is_draft::text || ':' || is_public::text FROM public.game_rooms WHERE id = v_room),
    'false:true', 'the host settles it, published');

  -- ── a level-up is paid once ──────────────────────────────────────────────
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'currency_grants'
       AND indexname = 'currency_grants_level_up_reference_unique'),
    1::bigint, 'the partial unique index exists');

  PERFORM pg_temp.as_user(a);
  PERFORM public.credit_gameplay_reward('level_up', 150, 0, 'geography:level 3');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 5150, 'the level pays once');
  PERFORM pg_temp.must_fail(
    $q$SELECT public.credit_gameplay_reward('level_up', 150, 0, 'geography:level 3')$q$,
    'the retry of the same level lands on the index');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 5150, 'and pays nothing');
  PERFORM pg_temp.must_equal(
    (SELECT count(*) FROM public.currency_grants WHERE user_id = a AND kind = 'level_up'),
    1::bigint, 'one ledger row');
  PERFORM public.credit_gameplay_reward('level_up', 150, 0, 'geography:level 4');
  PERFORM pg_temp.must_equal(pg_temp.coins_of(a), 5300, 'the next level is a different reference, and pays');
  PERFORM pg_temp.as_user(NULL);
END $$;
