-- Team Battle: server-authoritative match state (docs/GAME_TYPES_DESIGN.md §2).
--
-- Two teams of equal size (1v1..5v5) on one room. A board of priced category
-- tiles; a turn is one spotlight player answering rapid-fire questions in a
-- picked tile before a server deadline; points are slices of the tile's
-- price. Rock-paper-scissors (whole-team majority throw) decides who picks
-- first; an exact points tie sends one voted champion per team into a
-- first-to-3 blitz.
--
-- Everything that decides the match lives here, not in clients:
--   * all timers are server deadlines — clients only render countdowns and
--     call tb_advance when one expires; the first caller wins, the rest no-op
--     (the complete_room_round / tv_advance_question pattern);
--   * answer correctness, scoring, rotation ("everyone plays before anyone
--     plays twice"), tile prices and payouts are computed in the RPCs;
--   * clients write nothing to these tables directly — RLS grants SELECT to
--     the room's participants and no write policies exist.
--
-- What stays client-side, matching the existing room flow: the host's device
-- picks categories and fetches the question material through
-- questionService.getQuestions and hands it to tb_start_match. The server
-- prices the tiles itself and validates the shape; the questions' *content*
-- is trusted the same way room_questions already is. A spotlight player can
-- read correct answers out of the board row exactly as any room player can
-- read room_questions today — same trust level, noted in the design doc.

-- ── 1. Teams on the roster ─────────────────────────────────────────────────
--
-- Players pick their own side in the lobby (the existing own-row UPDATE
-- policy on room_participants covers it); tb_start_match refuses to start
-- until the teams are equal and everyone joined has one.

ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS team text CHECK (team IN ('a', 'b'));
ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS turn_order integer;

-- ── 2. The board ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_battle_board (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  game_id         uuid NOT NULL REFERENCES public.room_games(id) ON DELETE CASCADE,
  tile_index      integer NOT NULL,
  category_id     text,
  category_name   text NOT NULL,
  difficulty      text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  price           integer NOT NULL,
  -- The rapid-fire material for this tile:
  -- [{question_text, correct_answer, shuffled_answers, image_url?}, ...]
  questions       jsonb NOT NULL,
  claimed_by_team text CHECK (claimed_by_team IN ('a', 'b')),
  played_by       uuid,
  correct_count   integer NOT NULL DEFAULT 0,
  points_earned   integer NOT NULL DEFAULT 0,
  played_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, tile_index)
);

-- ── 3. The match state machine ─────────────────────────────────────────────
--
-- One row per room; a rematch overwrites it. Clients subscribe to UPDATEs on
-- this row and render whatever phase it says.

CREATE TABLE IF NOT EXISTS public.team_battle_state (
  room_id        uuid PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  game_id        uuid NOT NULL REFERENCES public.room_games(id) ON DELETE CASCADE,
  phase          text NOT NULL CHECK (phase IN
                   ('rps', 'board', 'rapid_fire', 'super_vote', 'super_round', 'done')),
  active_team    text CHECK (active_team IN ('a', 'b')),
  active_player  uuid,
  active_tile    uuid REFERENCES public.team_battle_board(id),
  -- The one live deadline, whatever the phase: rps close, tile pick, turn
  -- end, vote close, or the current super-round question.
  deadline       timestamptz,
  turn_seconds   integer NOT NULL DEFAULT 40,
  target_correct integer NOT NULL DEFAULT 5,
  team_a_score   integer NOT NULL DEFAULT 0,
  team_b_score   integer NOT NULL DEFAULT 0,
  -- Answers submitted so far in the current rapid-fire turn; doubles as the
  -- index of the question the spotlight player must answer next.
  turn_answers   integer NOT NULL DEFAULT 0,
  -- {throws: {user_id: gesture}, team_a: gesture, team_b: gesture}
  rps            jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- {questions: [...], votes: {voter: candidate}, champion_a, champion_b,
  --  score_a, score_b, question_index, attempted: {user_id: true}}
  super          jsonb NOT NULL DEFAULT '{}'::jsonb,
  winner_team    text CHECK (winner_team IN ('a', 'b')),
  settled        boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_battle_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_battle_state ENABLE ROW LEVEL SECURITY;

-- Readable by the room's players; written only by the RPCs below (no client
-- write policies on purpose — see CLAUDE.md rule 3's posture).
DROP POLICY IF EXISTS "Participants can view their board" ON public.team_battle_board;
CREATE POLICY "Participants can view their board"
  ON public.team_battle_board FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = team_battle_board.room_id AND rp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Participants can view their match state" ON public.team_battle_state;
CREATE POLICY "Participants can view their match state"
  ON public.team_battle_state FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = team_battle_state.room_id AND rp.user_id = auth.uid()
  ));

-- Phase transitions reach clients as postgres_changes on these tables.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.team_battle_state;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.team_battle_state;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.team_battle_board;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.team_battle_state REPLICA IDENTITY FULL;
ALTER TABLE public.team_battle_board REPLICA IDENTITY FULL;

-- ── 4. Payout ceilings and ledger idempotency ──────────────────────────────
--
-- tb_settle decides the amounts itself and credits through
-- apply_currency_grant; these rows make the kinds known (an unknown kind in
-- credit_gameplay_reward raises — src/__tests__/missionRewardLimits.test.ts)
-- and document the intended ceilings.

INSERT INTO public.currency_grant_limits
  (kind,               max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('team_battle_win',             300,             0,          3000,            0),
  ('team_battle_play',             50,             0,           500,            0)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;

-- One payout per player per match, enforced at the ledger like the stake
-- settlements are.
CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_team_battle_reference_unique
  ON public.currency_grants (user_id, kind, reference)
  WHERE kind IN ('team_battle_win', 'team_battle_play') AND reference IS NOT NULL;

-- ── 5. Internal helpers (not granted to anyone) ────────────────────────────

-- The rotation rule: within a team, whoever has played the fewest tiles goes
-- next; turn_order (shuffled at match start) breaks ties. This is what makes
-- "each player plays at least one turn before any teammate plays a second"
-- hold for any team size.
CREATE OR REPLACE FUNCTION public.tb_next_player(p_room_id uuid, p_game_id uuid, p_team text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rp.user_id
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS played
        FROM public.team_battle_board b
       WHERE b.game_id = p_game_id AND b.played_by = rp.user_id
    ) plays ON true
   -- status = 'playing' scopes the rotation to the roster tb_start_match
   -- validated; someone who joined the room mid-match is a spectator until
   -- the next game, never the spotlight player.
   WHERE rp.room_id = p_room_id AND rp.team = p_team AND rp.status = 'playing'
   ORDER BY plays.played ASC, rp.turn_order ASC NULLS LAST
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.tb_next_player(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- Majority gesture for one team, missing throws filled at random; among tied
-- gestures the pick is random. Returns 'rock' | 'paper' | 'scissors'.
CREATE OR REPLACE FUNCTION public.tb_team_throw(p_room_id uuid, p_throws jsonb, p_team text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gesture FROM (
    SELECT COALESCE(
             p_throws ->> rp.user_id::text,
             (ARRAY['rock', 'paper', 'scissors'])[1 + floor(random() * 3)::int]
           ) AS gesture
      FROM public.room_participants rp
     WHERE rp.room_id = p_room_id AND rp.team = p_team AND rp.status = 'playing'
  ) g
  GROUP BY gesture
  ORDER BY count(*) DESC, random()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.tb_team_throw(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;

-- Resolves rock-paper-scissors between the two team throws and moves the
-- match to the board. A gesture tie is a random winner — one round of
-- theater, never a stall.
CREATE OR REPLACE FUNCTION public.tb_resolve_rps(p_state public.team_battle_state)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a text;
  v_b text;
  v_winner text;
BEGIN
  v_a := public.tb_team_throw(p_state.room_id, COALESCE(p_state.rps -> 'throws', '{}'::jsonb), 'a');
  v_b := public.tb_team_throw(p_state.room_id, COALESCE(p_state.rps -> 'throws', '{}'::jsonb), 'b');

  IF v_a = v_b THEN
    v_winner := CASE WHEN random() < 0.5 THEN 'a' ELSE 'b' END;
  ELSIF (v_a = 'rock' AND v_b = 'scissors')
     OR (v_a = 'scissors' AND v_b = 'paper')
     OR (v_a = 'paper' AND v_b = 'rock') THEN
    v_winner := 'a';
  ELSE
    v_winner := 'b';
  END IF;

  UPDATE public.team_battle_state
     SET phase = 'board',
         active_team = v_winner,
         active_player = public.tb_next_player(p_state.room_id, p_state.game_id, v_winner),
         deadline = now() + interval '30 seconds',
         rps = COALESCE(p_state.rps, '{}'::jsonb)
                 || jsonb_build_object('team_a', v_a, 'team_b', v_b, 'winner', v_winner),
         updated_at = now()
   WHERE room_id = p_state.room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_resolve_rps(public.team_battle_state) FROM PUBLIC, anon, authenticated;

-- Closes the current rapid-fire turn: stamps the tile, then either hands the
-- board to the other team, or — board exhausted — ends the match (tie goes
-- to the super-round vote).
CREATE OR REPLACE FUNCTION public.tb_close_turn(p_state public.team_battle_state)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.team_battle_state;
  v_next_team text;
  v_remaining integer;
BEGIN
  UPDATE public.team_battle_board
     SET claimed_by_team = p_state.active_team,
         played_by = p_state.active_player,
         played_at = now()
   WHERE id = p_state.active_tile
     AND claimed_by_team IS NULL;

  SELECT count(*) INTO v_remaining
    FROM public.team_battle_board
   WHERE game_id = p_state.game_id AND claimed_by_team IS NULL;

  SELECT * INTO v_state FROM public.team_battle_state WHERE room_id = p_state.room_id;

  IF v_remaining > 0 THEN
    v_next_team := CASE WHEN p_state.active_team = 'a' THEN 'b' ELSE 'a' END;
    UPDATE public.team_battle_state
       SET phase = 'board',
           active_team = v_next_team,
           active_player = public.tb_next_player(p_state.room_id, p_state.game_id, v_next_team),
           active_tile = NULL,
           turn_answers = 0,
           deadline = now() + interval '30 seconds',
           updated_at = now()
     WHERE room_id = p_state.room_id;
  ELSIF v_state.team_a_score = v_state.team_b_score THEN
    UPDATE public.team_battle_state
       SET phase = 'super_vote',
           active_team = NULL,
           active_player = NULL,
           active_tile = NULL,
           turn_answers = 0,
           deadline = now() + interval '30 seconds',
           super = COALESCE(v_state.super, '{}'::jsonb)
                     || jsonb_build_object('votes', '{}'::jsonb, 'score_a', 0, 'score_b', 0,
                                           'question_index', 0, 'attempted', '{}'::jsonb),
           updated_at = now()
     WHERE room_id = p_state.room_id;
  ELSE
    UPDATE public.team_battle_state
       SET phase = 'done',
           winner_team = CASE WHEN v_state.team_a_score > v_state.team_b_score THEN 'a' ELSE 'b' END,
           active_team = NULL,
           active_player = NULL,
           active_tile = NULL,
           deadline = NULL,
           updated_at = now()
     WHERE room_id = p_state.room_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_close_turn(public.team_battle_state) FROM PUBLIC, anon, authenticated;

-- Resolves the super-round vote into one champion per team: most votes wins,
-- ties and vote-less teams fall back to rotation order.
CREATE OR REPLACE FUNCTION public.tb_resolve_super_vote(p_state public.team_battle_state)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champion_a uuid;
  v_champion_b uuid;
BEGIN
  SELECT rp.user_id INTO v_champion_a
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS votes
        FROM jsonb_each_text(COALESCE(p_state.super -> 'votes', '{}'::jsonb)) v
       WHERE v.value = rp.user_id::text
    ) tally ON true
   WHERE rp.room_id = p_state.room_id AND rp.team = 'a' AND rp.status = 'playing'
   ORDER BY tally.votes DESC, rp.turn_order ASC NULLS LAST
   LIMIT 1;

  SELECT rp.user_id INTO v_champion_b
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS votes
        FROM jsonb_each_text(COALESCE(p_state.super -> 'votes', '{}'::jsonb)) v
       WHERE v.value = rp.user_id::text
    ) tally ON true
   WHERE rp.room_id = p_state.room_id AND rp.team = 'b' AND rp.status = 'playing'
   ORDER BY tally.votes DESC, rp.turn_order ASC NULLS LAST
   LIMIT 1;

  UPDATE public.team_battle_state
     SET phase = 'super_round',
         deadline = now() + interval '15 seconds',
         super = COALESCE(p_state.super, '{}'::jsonb)
                   || jsonb_build_object('champion_a', v_champion_a, 'champion_b', v_champion_b,
                                         'question_index', 0, 'attempted', '{}'::jsonb,
                                         'score_a', 0, 'score_b', 0),
         updated_at = now()
   WHERE room_id = p_state.room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_resolve_super_vote(public.team_battle_state) FROM PUBLIC, anon, authenticated;

-- Moves the super round on by one question (nobody scored it, or it was
-- decided) and ends the blitz at 3 points or when the material runs out.
CREATE OR REPLACE FUNCTION public.tb_advance_super(p_state public.team_battle_state)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score_a integer := COALESCE((p_state.super ->> 'score_a')::integer, 0);
  v_score_b integer := COALESCE((p_state.super ->> 'score_b')::integer, 0);
  v_next    integer := COALESCE((p_state.super ->> 'question_index')::integer, 0) + 1;
  v_total   integer := jsonb_array_length(COALESCE(p_state.super -> 'questions', '[]'::jsonb));
  v_winner  text;
BEGIN
  IF v_score_a >= 3 OR v_score_b >= 3 OR v_next >= v_total THEN
    IF v_score_a = v_score_b THEN
      v_winner := CASE WHEN random() < 0.5 THEN 'a' ELSE 'b' END;
    ELSE
      v_winner := CASE WHEN v_score_a > v_score_b THEN 'a' ELSE 'b' END;
    END IF;
    UPDATE public.team_battle_state
       SET phase = 'done',
           winner_team = v_winner,
           deadline = NULL,
           updated_at = now()
     WHERE room_id = p_state.room_id;
  ELSE
    UPDATE public.team_battle_state
       SET deadline = now() + interval '15 seconds',
           super = p_state.super
                     || jsonb_build_object('question_index', v_next, 'attempted', '{}'::jsonb),
           updated_at = now()
     WHERE room_id = p_state.room_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_advance_super(public.team_battle_state) FROM PUBLIC, anon, authenticated;

-- ── 6. The player-facing RPCs ──────────────────────────────────────────────

-- Starts a match. Host-only. The board arrives as jsonb:
--   {tiles: [{category_id?, category_name, difficulty, questions: [...]}],
--    super_questions: [...]}
-- The server prices tiles from difficulty (clients cannot name a price),
-- shuffles the turn order, and opens with rock-paper-scissors.
CREATE OR REPLACE FUNCTION public.tb_start_match(
  p_room_id uuid,
  p_board jsonb,
  p_turn_seconds integer DEFAULT 40
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_room public.game_rooms%ROWTYPE;
  v_team_a integer;
  v_team_b integer;
  v_teamless integer;
  v_tiles jsonb;
  v_tile jsonb;
  v_game_id uuid;
  v_i integer := 0;
  v_price integer;
  v_qcount integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  IF v_room.host_user_id <> v_caller THEN
    RAISE EXCEPTION 'Only the host can start the match';
  END IF;
  IF v_room.game_type_key IS DISTINCT FROM 'team_battle' THEN
    RAISE EXCEPTION 'Not a team battle room';
  END IF;
  -- The dark launch holds against hand-crafted calls, as in mm_enqueue.
  IF NOT EXISTS (SELECT 1 FROM public.game_types WHERE key = 'team_battle' AND is_live) THEN
    RAISE EXCEPTION 'This game type is not live yet';
  END IF;
  IF v_room.status = 'playing' THEN
    RAISE EXCEPTION 'Match already running';
  END IF;

  SELECT count(*) FILTER (WHERE team = 'a'),
         count(*) FILTER (WHERE team = 'b'),
         count(*) FILTER (WHERE team IS NULL)
    INTO v_team_a, v_team_b, v_teamless
    FROM public.room_participants
   WHERE room_id = p_room_id
     AND status IN ('joined', 'ready', 'playing');

  IF v_teamless > 0 THEN
    RAISE EXCEPTION 'Every player must pick a team';
  END IF;
  IF v_team_a < 1 OR v_team_b < 1 THEN
    RAISE EXCEPTION 'Both teams need at least one player';
  END IF;
  IF v_team_a <> v_team_b THEN
    RAISE EXCEPTION 'Teams must be the same size (% vs %)', v_team_a, v_team_b;
  END IF;
  IF v_team_a > 5 THEN
    RAISE EXCEPTION 'Teams are capped at 5 players';
  END IF;

  v_tiles := p_board -> 'tiles';
  IF v_tiles IS NULL OR jsonb_typeof(v_tiles) <> 'array' THEN
    RAISE EXCEPTION 'Board must carry a tiles array';
  END IF;
  IF jsonb_array_length(v_tiles) < 2 * v_team_a THEN
    RAISE EXCEPTION 'Need at least % tiles so every player gets a turn', 2 * v_team_a;
  END IF;
  IF jsonb_array_length(v_tiles) > 12 OR jsonb_array_length(v_tiles) % 2 <> 0 THEN
    RAISE EXCEPTION 'Board must be an even number of tiles, at most 12';
  END IF;
  IF jsonb_array_length(COALESCE(p_board -> 'super_questions', '[]'::jsonb)) < 5 THEN
    RAISE EXCEPTION 'Board must carry at least 5 super-round questions';
  END IF;
  IF p_turn_seconds IS NULL OR p_turn_seconds < 20 OR p_turn_seconds > 90 THEN
    RAISE EXCEPTION 'Turn length must be between 20 and 90 seconds';
  END IF;

  INSERT INTO public.room_games (room_id, game_number)
  VALUES (
    p_room_id,
    COALESCE((SELECT max(game_number) FROM public.room_games WHERE room_id = p_room_id), 0) + 1
  )
  RETURNING id INTO v_game_id;

  FOR v_tile IN SELECT * FROM jsonb_array_elements(v_tiles) LOOP
    IF COALESCE(v_tile ->> 'category_name', '') = '' THEN
      RAISE EXCEPTION 'Tile % has no category name', v_i;
    END IF;
    IF v_tile ->> 'difficulty' NOT IN ('easy', 'medium', 'hard') THEN
      RAISE EXCEPTION 'Tile % has an unknown difficulty', v_i;
    END IF;
    v_qcount := jsonb_array_length(COALESCE(v_tile -> 'questions', '[]'::jsonb));
    IF v_qcount < 5 OR v_qcount > 30 THEN
      RAISE EXCEPTION 'Tile % needs 5..30 questions, has %', v_i, v_qcount;
    END IF;

    v_price := CASE v_tile ->> 'difficulty'
                 WHEN 'easy' THEN 100
                 WHEN 'medium' THEN 200
                 ELSE 400
               END;

    INSERT INTO public.team_battle_board
      (room_id, game_id, tile_index, category_id, category_name, difficulty, price, questions)
    VALUES
      (p_room_id, v_game_id, v_i, v_tile ->> 'category_id', v_tile ->> 'category_name',
       v_tile ->> 'difficulty', v_price, v_tile -> 'questions');

    v_i := v_i + 1;
  END LOOP;

  -- Shuffled once; the rotation rule reads it for the life of the match.
  WITH shuffled AS (
    SELECT user_id, row_number() OVER (PARTITION BY team ORDER BY random()) AS rn
      FROM public.room_participants
     WHERE room_id = p_room_id AND status IN ('joined', 'ready', 'playing')
  )
  UPDATE public.room_participants rp
     SET turn_order = s.rn,
         score = 0,
         status = 'playing'::public.participant_status
    FROM shuffled s
   WHERE rp.room_id = p_room_id AND rp.user_id = s.user_id;

  INSERT INTO public.team_battle_state
    (room_id, game_id, phase, deadline, turn_seconds, super)
  VALUES
    (p_room_id, v_game_id, 'rps', now() + interval '15 seconds', p_turn_seconds,
     jsonb_build_object('questions', p_board -> 'super_questions'))
  ON CONFLICT (room_id) DO UPDATE
    SET game_id = EXCLUDED.game_id,
        phase = 'rps',
        active_team = NULL,
        active_player = NULL,
        active_tile = NULL,
        deadline = EXCLUDED.deadline,
        turn_seconds = EXCLUDED.turn_seconds,
        target_correct = 5,
        team_a_score = 0,
        team_b_score = 0,
        turn_answers = 0,
        rps = '{}'::jsonb,
        super = EXCLUDED.super,
        winner_team = NULL,
        settled = false,
        updated_at = now();

  UPDATE public.game_rooms
     SET status = 'playing'::public.room_status,
         current_game_id = v_game_id,
         started_at = now(),
         last_activity_at = now()
   WHERE id = p_room_id;

  RETURN v_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_start_match(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_start_match(uuid, jsonb, integer) TO authenticated;

-- One gesture per player. When the last throw lands the opener resolves
-- immediately; stragglers are filled in at random on the deadline instead.
CREATE OR REPLACE FUNCTION public.tb_submit_rps(p_room_id uuid, p_throw text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_players integer;
  v_throws jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_throw NOT IN ('rock', 'paper', 'scissors') THEN
    RAISE EXCEPTION 'Unknown gesture: %', p_throw;
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'rps' THEN
    RAISE EXCEPTION 'Not in the rock-paper-scissors phase';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = v_caller
       AND team IS NOT NULL AND status = 'playing'
  ) THEN
    RAISE EXCEPTION 'Not a player in this match';
  END IF;

  v_throws := COALESCE(v_state.rps -> 'throws', '{}'::jsonb)
                || jsonb_build_object(v_caller::text, p_throw);

  UPDATE public.team_battle_state
     SET rps = COALESCE(rps, '{}'::jsonb) || jsonb_build_object('throws', v_throws),
         updated_at = now()
   WHERE room_id = p_room_id
  RETURNING * INTO v_state;

  SELECT count(*) INTO v_players
    FROM public.room_participants
   WHERE room_id = p_room_id AND team IS NOT NULL
     AND status = 'playing';

  IF (SELECT count(*) FROM jsonb_object_keys(v_throws)) >= v_players THEN
    PERFORM public.tb_resolve_rps(v_state);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_submit_rps(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_submit_rps(uuid, text) TO authenticated;

-- The spotlight player picks a tile and the rapid-fire clock starts.
CREATE OR REPLACE FUNCTION public.tb_pick_tile(p_room_id uuid, p_tile_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_deadline timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'board' THEN
    RAISE EXCEPTION 'Not in the board phase';
  END IF;
  IF v_state.active_player <> v_caller THEN
    RAISE EXCEPTION 'It is not your turn to pick';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_battle_board
     WHERE id = p_tile_id AND game_id = v_state.game_id AND claimed_by_team IS NULL
  ) THEN
    RAISE EXCEPTION 'Tile is not on the board or already played';
  END IF;

  v_deadline := now() + make_interval(secs => v_state.turn_seconds);

  UPDATE public.team_battle_state
     SET phase = 'rapid_fire',
         active_tile = p_tile_id,
         turn_answers = 0,
         deadline = v_deadline,
         updated_at = now()
   WHERE room_id = p_room_id;

  RETURN v_deadline;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_pick_tile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_pick_tile(uuid, uuid) TO authenticated;

-- One rapid-fire answer. Questions must be answered in order (p_question_index
-- is the server's own turn_answers counter, so a replayed or skipped submit is
-- refused), correctness is decided here, and a correct answer earns
-- price / target_correct — capped so a tile never pays more than its price.
CREATE OR REPLACE FUNCTION public.tb_submit_answer(
  p_room_id uuid,
  p_question_index integer,
  p_answer text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_tile public.team_battle_board%ROWTYPE;
  v_question jsonb;
  v_correct boolean;
  v_points integer := 0;
  v_slice integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'rapid_fire' THEN
    RAISE EXCEPTION 'Not in a rapid-fire turn';
  END IF;
  IF v_state.active_player <> v_caller THEN
    RAISE EXCEPTION 'You are not the spotlight player';
  END IF;
  -- Two seconds of grace for a submit that raced the deadline over the wire.
  IF now() > v_state.deadline + interval '2 seconds' THEN
    RAISE EXCEPTION 'Turn is over';
  END IF;
  IF p_question_index IS DISTINCT FROM v_state.turn_answers THEN
    RAISE EXCEPTION 'Expected answer for question %', v_state.turn_answers;
  END IF;

  SELECT * INTO v_tile FROM public.team_battle_board WHERE id = v_state.active_tile;
  IF p_question_index >= jsonb_array_length(v_tile.questions) THEN
    RAISE EXCEPTION 'No more questions in this tile';
  END IF;

  v_question := v_tile.questions -> p_question_index;
  v_correct := btrim(COALESCE(p_answer, '')) = btrim(v_question ->> 'correct_answer');

  IF v_correct THEN
    v_slice := GREATEST(1, v_tile.price / v_state.target_correct);
    v_points := LEAST(v_slice, v_tile.price - v_tile.points_earned);
  END IF;

  UPDATE public.team_battle_board
     SET correct_count = correct_count + CASE WHEN v_correct THEN 1 ELSE 0 END,
         points_earned = points_earned + v_points
   WHERE id = v_tile.id;

  UPDATE public.team_battle_state
     SET turn_answers = turn_answers + 1,
         team_a_score = team_a_score + CASE WHEN v_state.active_team = 'a' THEN v_points ELSE 0 END,
         team_b_score = team_b_score + CASE WHEN v_state.active_team = 'b' THEN v_points ELSE 0 END,
         updated_at = now()
   WHERE room_id = p_room_id;

  -- The spotlight player's live score, for the roster UI the room already has.
  UPDATE public.room_participants
     SET score = COALESCE(score, 0) + v_points,
         current_question = v_state.turn_answers + 1
   WHERE room_id = p_room_id AND user_id = v_caller;

  RETURN jsonb_build_object(
    'correct', v_correct,
    'points', v_points,
    'answered', v_state.turn_answers + 1,
    'of', jsonb_array_length(v_tile.questions)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.tb_submit_answer(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_submit_answer(uuid, integer, text) TO authenticated;

-- A super-round vote: pick the teammate (or yourself) who plays the blitz.
CREATE OR REPLACE FUNCTION public.tb_vote_super(p_room_id uuid, p_candidate uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_team text;
  v_votes jsonb;
  v_players integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'super_vote' THEN
    RAISE EXCEPTION 'Not in the super-round vote';
  END IF;

  SELECT team INTO v_team FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = v_caller AND status = 'playing';
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'Not a player in this match';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = p_candidate
       AND team = v_team AND status = 'playing'
  ) THEN
    RAISE EXCEPTION 'Champion must be on your own team';
  END IF;

  v_votes := COALESCE(v_state.super -> 'votes', '{}'::jsonb)
               || jsonb_build_object(v_caller::text, p_candidate::text);

  UPDATE public.team_battle_state
     SET super = super || jsonb_build_object('votes', v_votes),
         updated_at = now()
   WHERE room_id = p_room_id
  RETURNING * INTO v_state;

  SELECT count(*) INTO v_players
    FROM public.room_participants
   WHERE room_id = p_room_id AND team IS NOT NULL AND status = 'playing';

  IF (SELECT count(*) FROM jsonb_object_keys(v_votes)) >= v_players THEN
    PERFORM public.tb_resolve_super_vote(v_state);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_vote_super(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_vote_super(uuid, uuid) TO authenticated;

-- A super-round answer. Both champions see the same question; the first
-- correct answer scores (the state row lock is the claim), a wrong answer
-- burns that champion's shot at it, and two burned shots move the round on.
CREATE OR REPLACE FUNCTION public.tb_submit_super(
  p_room_id uuid,
  p_question_index integer,
  p_answer text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_question jsonb;
  v_correct boolean;
  v_my_team text;
  v_attempted jsonb;
  v_score_key text;
  v_new_score integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'super_round' THEN
    RAISE EXCEPTION 'Not in the super round';
  END IF;
  IF v_caller::text NOT IN (v_state.super ->> 'champion_a', v_state.super ->> 'champion_b') THEN
    RAISE EXCEPTION 'Only the champions play the super round';
  END IF;
  IF p_question_index IS DISTINCT FROM COALESCE((v_state.super ->> 'question_index')::integer, 0) THEN
    RAISE EXCEPTION 'That question is no longer live';
  END IF;
  IF now() > v_state.deadline + interval '2 seconds' THEN
    RAISE EXCEPTION 'Too late for this question';
  END IF;
  IF COALESCE((v_state.super -> 'attempted' ->> v_caller::text)::boolean, false) THEN
    RAISE EXCEPTION 'You already answered this question';
  END IF;

  v_question := v_state.super -> 'questions' -> p_question_index;
  v_correct := btrim(COALESCE(p_answer, '')) = btrim(v_question ->> 'correct_answer');
  v_my_team := CASE WHEN v_caller::text = v_state.super ->> 'champion_a' THEN 'a' ELSE 'b' END;

  IF v_correct THEN
    v_score_key := 'score_' || v_my_team;
    v_new_score := COALESCE((v_state.super ->> v_score_key)::integer, 0) + 1;
    UPDATE public.team_battle_state
       SET super = super || jsonb_build_object(v_score_key, v_new_score),
           updated_at = now()
     WHERE room_id = p_room_id
    RETURNING * INTO v_state;
    PERFORM public.tb_advance_super(v_state);
    RETURN jsonb_build_object('correct', true, 'score', v_new_score);
  END IF;

  v_attempted := COALESCE(v_state.super -> 'attempted', '{}'::jsonb)
                   || jsonb_build_object(v_caller::text, true);
  UPDATE public.team_battle_state
     SET super = super || jsonb_build_object('attempted', v_attempted),
         updated_at = now()
   WHERE room_id = p_room_id
  RETURNING * INTO v_state;

  -- Both champions burned their shot: nobody scores, next question.
  IF (SELECT count(*) FROM jsonb_object_keys(v_attempted)) >= 2 THEN
    PERFORM public.tb_advance_super(v_state);
  END IF;

  RETURN jsonb_build_object('correct', false);
END;
$$;

REVOKE ALL ON FUNCTION public.tb_submit_super(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_submit_super(uuid, integer, text) TO authenticated;

-- The deadline pump. Any participant may call it when the countdown they are
-- rendering hits zero; the row lock serialises racing callers and a call that
-- finds nothing expired is a no-op that reports the current phase.
CREATE OR REPLACE FUNCTION public.tb_advance(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_tile_questions integer;
  v_random_tile uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Not a participant of this room';
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL THEN
    RAISE EXCEPTION 'No match in this room';
  END IF;

  IF v_state.phase = 'rps' AND now() > v_state.deadline THEN
    PERFORM public.tb_resolve_rps(v_state);

  ELSIF v_state.phase = 'board' AND now() > v_state.deadline THEN
    -- A pick that never came: play a random tile rather than stall the match.
    SELECT id INTO v_random_tile
      FROM public.team_battle_board
     WHERE game_id = v_state.game_id AND claimed_by_team IS NULL
     ORDER BY random() LIMIT 1;
    UPDATE public.team_battle_state
       SET phase = 'rapid_fire',
           active_tile = v_random_tile,
           turn_answers = 0,
           deadline = now() + make_interval(secs => v_state.turn_seconds),
           updated_at = now()
     WHERE room_id = p_room_id;

  ELSIF v_state.phase = 'rapid_fire' THEN
    SELECT jsonb_array_length(questions) INTO v_tile_questions
      FROM public.team_battle_board WHERE id = v_state.active_tile;
    -- A turn closes when its clock runs out or its material does.
    IF now() > v_state.deadline OR v_state.turn_answers >= v_tile_questions THEN
      PERFORM public.tb_close_turn(v_state);
    END IF;

  ELSIF v_state.phase = 'super_vote' AND now() > v_state.deadline THEN
    PERFORM public.tb_resolve_super_vote(v_state);

  ELSIF v_state.phase = 'super_round' AND now() > v_state.deadline THEN
    PERFORM public.tb_advance_super(v_state);
  END IF;

  SELECT phase INTO v_state.phase FROM public.team_battle_state WHERE room_id = p_room_id;
  RETURN v_state.phase;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_advance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_advance(uuid) TO authenticated;

-- Settles a finished match exactly once: the round snapshot the room stack
-- already keeps (room_games, room_match_history, cumulative totals), the
-- room back to waiting for a rematch, and the payouts — amounts decided
-- here, credited through the ledger, one per player per match.
CREATE OR REPLACE FUNCTION public.tb_settle(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win_coins  constant integer := 300;
  v_play_coins constant integer := 50;
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_claimed uuid;
  v_scores jsonb;
  v_reference text;
  v_player record;
  v_mvp uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Not a participant of this room';
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'done' THEN
    RAISE EXCEPTION 'Match is not finished';
  END IF;

  -- First caller claims the settlement; everyone else no-ops.
  UPDATE public.team_battle_state
     SET settled = true, updated_at = now()
   WHERE room_id = p_room_id AND settled = false
  RETURNING room_id INTO v_claimed;
  IF v_claimed IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'winner_team', v_state.winner_team);
  END IF;

  v_reference := p_room_id::text || ':' || v_state.game_id::text;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', user_id, 'nickname', nickname, 'avatar_url', avatar_url,
           'team', team, 'score', COALESCE(score, 0))
           ORDER BY team, COALESCE(score, 0) DESC), '[]'::jsonb)
    INTO v_scores
    FROM public.room_participants
   WHERE room_id = p_room_id AND team IS NOT NULL;

  -- The "winner" a per-player history schema can hold: the winning team's
  -- top scorer.
  SELECT user_id INTO v_mvp
    FROM public.room_participants
   WHERE room_id = p_room_id AND team = v_state.winner_team
   ORDER BY COALESCE(score, 0) DESC, turn_order ASC NULLS LAST
   LIMIT 1;

  UPDATE public.room_games
     SET completed_at = now(),
         totals_applied = true,
         winner_user_id = v_mvp,
         player_scores = v_scores,
         questions_data = jsonb_build_object(
           'mode', 'team_battle',
           'team_a_score', v_state.team_a_score,
           'team_b_score', v_state.team_b_score,
           'winner_team', v_state.winner_team)
   WHERE id = v_state.game_id;

  INSERT INTO public.room_match_history (room_id, winner_user_id, player_scores)
  VALUES (p_room_id, v_mvp, v_scores);

  FOR v_player IN
    SELECT user_id, team FROM public.room_participants
     WHERE room_id = p_room_id AND team IS NOT NULL AND status = 'playing'
  LOOP
    UPDATE public.room_participants
       SET total_score = COALESCE(total_score, 0) + COALESCE(score, 0),
           total_rounds_played = COALESCE(total_rounds_played, 0) + 1,
           total_wins = COALESCE(total_wins, 0)
             + CASE WHEN v_player.team = v_state.winner_team THEN 1 ELSE 0 END
     WHERE room_id = p_room_id AND user_id = v_player.user_id;

    BEGIN
      PERFORM public.apply_currency_grant(
        v_player.user_id, 'team_battle_play', v_play_coins, 0, v_reference);
      IF v_player.team = v_state.winner_team THEN
        PERFORM public.apply_currency_grant(
          v_player.user_id, 'team_battle_win', v_win_coins, 0, v_reference);
      END IF;
    EXCEPTION WHEN unique_violation THEN
      NULL; -- this match already paid this player; never pay twice
    END;
  END LOOP;

  UPDATE public.game_rooms
     SET status = 'waiting'::public.room_status,
         current_game_id = NULL,
         last_activity_at = now()
   WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'applied', true,
    'winner_team', v_state.winner_team,
    'team_a_score', v_state.team_a_score,
    'team_b_score', v_state.team_b_score);
END;
$$;

REVOKE ALL ON FUNCTION public.tb_settle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_settle(uuid) TO authenticated;
