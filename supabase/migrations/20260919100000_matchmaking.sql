-- Global matchmaking, v1 (docs/GAME_TYPES_DESIGN.md §5).
--
-- The deliberately small shape: a queue table plus an opportunistic matcher
-- that runs INSIDE the enqueue call — no worker, no cron, nothing to deploy
-- beyond this migration (which matters here: edge functions are for side
-- effects and Lovable owns the deploys). Every enqueue takes a per-bucket
-- advisory lock, sweeps expired rows, and tries to cut a match from the
-- oldest waiters; when it succeeds it creates the room itself and stamps
-- every matched row with it. Players learn through realtime on their own
-- queue row (owner-only SELECT) and walk into a perfectly ordinary lobby:
--
--   * classic 1v1 → a normal game_rooms lobby with no category picked yet,
--     exactly the shape the TV-mission flow already creates; the host picks
--     and starts as in any friend room.
--   * team_battle → a Team Battle lobby with teams pre-assigned by arrival
--     order (players can still switch sides before the host starts).
--
-- Buckets are (game_type_key, language, team_size) — nobody is matched into
-- a room whose questions they cannot read. Deliberately NOT here in v1, per
-- the design doc: rating bands (the column exists, everyone writes 0),
-- parties (party_id exists, unused), cross-language matching, mid-match
-- backfill. FIFO within the bucket is the whole matching policy.
--
-- A queue entry not matched within 2 minutes expires; expiry is applied
-- lazily by whoever touches the bucket or asks for their own status next.

-- The chooser offers "global server" per game type off this flag; classic
-- was seeded before matchmaking existed.
UPDATE public.game_types SET supports_matchmaking = true WHERE key = 'classic';

CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  party_id        uuid,            -- friends queueing together; phase 2, unused in v1
  game_type_key   text NOT NULL REFERENCES public.game_types(key),
  language        text NOT NULL,
  team_size       integer CHECK (team_size BETWEEN 1 AND 5),
  rating          integer NOT NULL DEFAULT 0,  -- loose banding is phase 2; v1 writes 0
  status          text NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'matched', 'cancelled', 'expired')),
  matched_room_id uuid REFERENCES public.game_rooms(id) ON DELETE SET NULL,
  enqueued_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Own rows only: the realtime UPDATE that says "you are matched" reaches
-- exactly its owner, and nobody browses who else is waiting.
DROP POLICY IF EXISTS "Players see their own queue entries" ON public.matchmaking_queue;
CREATE POLICY "Players see their own queue entries"
  ON public.matchmaking_queue FOR SELECT
  USING (auth.uid() = user_id);
-- No write policies: the queue moves only through the RPCs below.

CREATE UNIQUE INDEX IF NOT EXISTS matchmaking_queue_one_waiting_per_user
  ON public.matchmaking_queue (user_id) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS matchmaking_queue_bucket_idx
  ON public.matchmaking_queue (game_type_key, language, team_size, status, enqueued_at);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.matchmaking_queue;
END $$;

ALTER TABLE public.matchmaking_queue REPLICA IDENTITY FULL;

-- ── internal helpers (not granted to anyone) ───────────────────────────────

-- How many players a bucket's match needs.
CREATE OR REPLACE FUNCTION public.mm_required_players(p_game_type_key text, p_team_size integer)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_game_type_key
           WHEN 'classic' THEN 2
           WHEN 'team_battle' THEN 2 * COALESCE(p_team_size, 2)
         END;
$$;

REVOKE ALL ON FUNCTION public.mm_required_players(text, integer) FROM PUBLIC, anon, authenticated;

-- What a client may know about their own entry.
CREATE OR REPLACE FUNCTION public.mm_entry_state(p_entry public.matchmaking_queue)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'queue_id', p_entry.id,
    'status', p_entry.status,
    'game_type_key', p_entry.game_type_key,
    'enqueued_at', p_entry.enqueued_at,
    'matched_room_id', p_entry.matched_room_id,
    'room_code', (SELECT room_code FROM public.game_rooms WHERE id = p_entry.matched_room_id));
$$;

REVOKE ALL ON FUNCTION public.mm_entry_state(public.matchmaking_queue) FROM PUBLIC, anon, authenticated;

-- The matcher. Serialised per bucket by an advisory lock so two concurrent
-- enqueues cannot cut overlapping matches; sweeps the bucket's expired rows;
-- cuts at most one match per call (the caller just joined, so at most one
-- new match is possible). Creates the room and stamps the matched rows in
-- the same transaction — a player is never told "matched" without a room.
CREATE OR REPLACE FUNCTION public.mm_try_match(
  p_game_type_key text,
  p_language text,
  p_team_size integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_need integer := public.mm_required_players(p_game_type_key, p_team_size);
  v_entries uuid[];
  v_users uuid[];
  v_host uuid;
  v_room public.game_rooms%ROWTYPE;
  v_code text;
  v_attempt integer;
  v_i integer;
  v_profile record;
BEGIN
  IF v_need IS NULL THEN
    RAISE EXCEPTION 'No matchmaking rules for %', p_game_type_key;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('mm:' || p_game_type_key || ':' || p_language || ':' || COALESCE(p_team_size, 0)::text));

  UPDATE public.matchmaking_queue
     SET status = 'expired', resolved_at = clock_timestamp()
   WHERE game_type_key = p_game_type_key
     AND language = p_language
     AND team_size IS NOT DISTINCT FROM p_team_size
     AND status = 'waiting'
     AND enqueued_at < now() - interval '2 minutes';

  SELECT array_agg(id ORDER BY enqueued_at), array_agg(user_id ORDER BY enqueued_at)
    INTO v_entries, v_users
    FROM (
      SELECT id, user_id, enqueued_at
        FROM public.matchmaking_queue
       WHERE game_type_key = p_game_type_key
         AND language = p_language
         AND team_size IS NOT DISTINCT FROM p_team_size
         AND status = 'waiting'
       ORDER BY enqueued_at
       LIMIT v_need
       FOR UPDATE
    ) picked;

  IF v_entries IS NULL OR array_length(v_entries, 1) < v_need THEN
    RETURN NULL;
  END IF;

  v_host := v_users[1];

  FOR v_attempt IN 1..3 LOOP
    v_code := (
      SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                               1 + floor(random() * 32)::int, 1), '')
        FROM generate_series(1, 6));
    BEGIN
      INSERT INTO public.game_rooms
        (room_code, host_user_id, status, game_type_key, game_mode,
         is_permanent, min_players, max_players, total_questions, last_activity_at)
      VALUES
        (v_code, v_host, 'waiting', p_game_type_key,
         CASE p_game_type_key WHEN 'classic' THEN 'random' ELSE p_game_type_key END,
         false, v_need, v_need, 5, now())
      RETURNING * INTO v_room;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt = 3 THEN RAISE; END IF;
    END;
  END LOOP;

  FOR v_i IN 1..v_need LOOP
    SELECT nickname, avatar_url, country_code INTO v_profile
      FROM public.profiles WHERE user_id = v_users[v_i];
    INSERT INTO public.room_participants
      (room_id, user_id, nickname, avatar_url, country_code, is_host, status, team)
    VALUES
      (v_room.id, v_users[v_i],
       COALESCE(v_profile.nickname, 'Player'), v_profile.avatar_url, v_profile.country_code,
       v_users[v_i] = v_host, 'joined',
       -- Team battle arrivals alternate sides, which lands equal teams for
       -- any even count; players can still switch in the lobby.
       CASE WHEN p_game_type_key = 'team_battle'
            THEN CASE WHEN v_i % 2 = 1 THEN 'a' ELSE 'b' END
       END);
  END LOOP;

  UPDATE public.matchmaking_queue
     SET status = 'matched', matched_room_id = v_room.id, resolved_at = clock_timestamp()
   WHERE id = ANY (v_entries);

  RETURN v_room.id;
END;
$$;

REVOKE ALL ON FUNCTION public.mm_try_match(text, text, integer) FROM PUBLIC, anon, authenticated;

-- ── the player-facing RPCs ─────────────────────────────────────────────────

-- Joins the global queue for one game type. Any previous waiting entry is
-- cancelled first (you can only be looking for one game), then the matcher
-- runs — so a queue that already holds enough players resolves before this
-- call even returns.
CREATE OR REPLACE FUNCTION public.mm_enqueue(
  p_game_type_key text,
  p_language text,
  p_team_size integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_type public.game_types%ROWTYPE;
  v_language text := COALESCE(NULLIF(btrim(p_language), ''), 'en');
  v_team_size integer;
  v_entry public.matchmaking_queue%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_type FROM public.game_types WHERE key = p_game_type_key;
  IF v_type.key IS NULL OR NOT v_type.supports_matchmaking THEN
    RAISE EXCEPTION 'No global queue for %', p_game_type_key;
  END IF;
  -- The dark launch holds here too: a mode hidden from the chooser takes no
  -- queue entries through a hand-crafted call either.
  IF NOT v_type.is_live THEN
    RAISE EXCEPTION 'This game type is not live yet';
  END IF;

  IF p_game_type_key = 'team_battle' THEN
    v_team_size := COALESCE(p_team_size, 2);
    IF v_team_size < 1 OR v_team_size > 5 THEN
      RAISE EXCEPTION 'Team size must be between 1 and 5';
    END IF;
  ELSE
    v_team_size := NULL;  -- a classic bucket has no team dimension
  END IF;

  UPDATE public.matchmaking_queue
     SET status = 'cancelled', resolved_at = clock_timestamp()
   WHERE user_id = v_user AND status = 'waiting';

  INSERT INTO public.matchmaking_queue (user_id, game_type_key, language, team_size)
  VALUES (v_user, p_game_type_key, v_language, v_team_size)
  RETURNING * INTO v_entry;

  PERFORM public.mm_try_match(p_game_type_key, v_language, v_team_size);

  SELECT * INTO v_entry FROM public.matchmaking_queue WHERE id = v_entry.id;
  RETURN public.mm_entry_state(v_entry);
END;
$$;

REVOKE ALL ON FUNCTION public.mm_enqueue(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mm_enqueue(text, text, integer) TO authenticated;

-- Leaves the queue. A no-op when nothing is waiting (the match may already
-- have been cut — the returned state says which).
CREATE OR REPLACE FUNCTION public.mm_cancel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entry public.matchmaking_queue%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.matchmaking_queue
     SET status = 'cancelled', resolved_at = clock_timestamp()
   WHERE user_id = v_user AND status = 'waiting';

  -- "Latest" means the waiting entry if one exists, else whichever entry
  -- resolved last — enqueue time alone misorders entries that resolved out
  -- of order.
  SELECT * INTO v_entry FROM public.matchmaking_queue
   WHERE user_id = v_user
   ORDER BY (status = 'waiting') DESC, COALESCE(resolved_at, enqueued_at) DESC
   LIMIT 1;
  IF v_entry.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public.mm_entry_state(v_entry);
END;
$$;

REVOKE ALL ON FUNCTION public.mm_cancel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mm_cancel() TO authenticated;

-- The caller's latest entry, with this user's own expiry applied lazily —
-- a resumed app learns "expired" here without waiting for bucket traffic.
CREATE OR REPLACE FUNCTION public.mm_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entry public.matchmaking_queue%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.matchmaking_queue
     SET status = 'expired', resolved_at = clock_timestamp()
   WHERE user_id = v_user AND status = 'waiting'
     AND enqueued_at < now() - interval '2 minutes';

  SELECT * INTO v_entry FROM public.matchmaking_queue
   WHERE user_id = v_user
   ORDER BY (status = 'waiting') DESC, COALESCE(resolved_at, enqueued_at) DESC
   LIMIT 1;
  IF v_entry.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public.mm_entry_state(v_entry);
END;
$$;

REVOKE ALL ON FUNCTION public.mm_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mm_status() TO authenticated;
