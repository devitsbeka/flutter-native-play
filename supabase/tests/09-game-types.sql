-- The game type registry is a read-only catalog (docs/GAME_TYPES_DESIGN.md §4).
--
-- The /play chooser renders from game_types and dark-launches modes off
-- is_live, so two things must stay true: everyone can read it, and no client
-- role can write it — a writable catalog would let a signed-in user flip a
-- mode live (or retitle one) for every player at once. Writes go through
-- migrations only, which under RLS means: SELECT policy present, zero
-- INSERT/UPDATE/DELETE policies.
--
-- Run after the migrations, same harness as the other suites (see README.md).

\set ON_ERROR_STOP on
\pset pager off

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got bigint, want bigint, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAILED: % -- got %, want %', label, got, want;
  END IF;
END $$;

-- The table exists and carries the four launch-era seed rows.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.game_types
   WHERE key IN ('classic', 'tv_show', 'team_battle', 'king');
  PERFORM pg_temp.must_equal(n, 4, 'game_types carries the four seed rows');
END $$;

-- RLS is on. Without it the no-write-policies assertion below proves nothing.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relname = 'game_types' AND c.relrowsecurity;
  PERFORM pg_temp.must_equal(n, 1, 'game_types has row level security enabled');
END $$;

-- Everyone may read the catalog...
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'game_types' AND cmd = 'SELECT';
  PERFORM pg_temp.must_equal(n, 1, 'game_types has a SELECT policy');
END $$;

-- ...and nobody may write it from a client. A later migration adding a write
-- policy "for convenience" is the regression this catches.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'game_types'
     AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  PERFORM pg_temp.must_equal(n, 0, 'game_types has no client write policies');
END $$;

-- game_rooms gained the key that ties a room to its game type.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'game_rooms'
     AND column_name = 'game_type_key';
  PERFORM pg_temp.must_equal(n, 1, 'game_rooms.game_type_key exists');
END $$;

\echo 'ok: game_types is a readable, client-immutable catalog'
