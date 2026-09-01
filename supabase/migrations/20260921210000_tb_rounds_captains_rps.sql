-- Three battle rules in one pass:
--
-- 1. Rounds follow the couch. The lobby's duration picker is gone — a
--    battle always runs two rounds per seated player (four per team-size,
--    teams equal by tb_start_match's own rule), so everyone gets at least
--    two spotlight turns. The board cap rises from 12 to 20 tiles for the
--    lounge's ten seats.
--
-- 2. Every team has a captain when the match starts. Captain votes still
--    decide it; a team that never voted gets its earliest joiner crowned
--    at start, because rule 3 needs somebody wearing the armband.
--
-- 3. Rock-paper-scissors is the captains' duel. Everyone throwing at once
--    made the team's gesture a majority-with-random-tiebreak nobody could
--    follow; now each captain throws for their team, the couch watches,
--    and the tie-replay rule (20260921190000) reads exactly like the
--    playground game. A captain who sleeps through the deadline is
--    dice-filled by the pump, so nothing stalls.
--
-- Full redefinitions of tb_start_match, tb_submit_rps and tb_team_throw.

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
  v_team text;
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
  IF jsonb_array_length(v_tiles) > 20 OR jsonb_array_length(v_tiles) % 2 <> 0 THEN
    RAISE EXCEPTION 'Board must be an even number of tiles, at most 20';
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

  -- The opener is the captains' duel, so both teams need one: a team that
  -- never voted gets its earliest-joined human crowned here. Bots only
  -- wear the armband on an all-bot team.
  FOR v_team IN SELECT unnest(ARRAY['a', 'b']) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.room_participants
       WHERE room_id = p_room_id AND team = v_team
         AND status = 'playing' AND is_captain
    ) THEN
      UPDATE public.room_participants
         SET is_captain = true
       WHERE id = (
         SELECT id FROM public.room_participants
          WHERE room_id = p_room_id AND team = v_team AND status = 'playing'
          ORDER BY COALESCE(is_bot, false), joined_at, id
          LIMIT 1
       );
    END IF;
  END LOOP;

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

-- Only the two captains throw; when the second gesture lands the opener
-- resolves at once (the deadline pump still dice-fills a sleeping captain).
CREATE OR REPLACE FUNCTION public.tb_submit_rps(p_room_id uuid, p_throw text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
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
       AND team IS NOT NULL AND status = 'playing' AND is_captain
  ) THEN
    RAISE EXCEPTION 'Only the captains throw the opener';
  END IF;

  v_throws := COALESCE(v_state.rps -> 'throws', '{}'::jsonb)
                || jsonb_build_object(v_caller::text, p_throw);

  UPDATE public.team_battle_state
     SET rps = COALESCE(rps, '{}'::jsonb) || jsonb_build_object('throws', v_throws),
         updated_at = now()
   WHERE room_id = p_room_id
  RETURNING * INTO v_state;

  -- Both armbands in: resolve now.
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants c
     WHERE c.room_id = p_room_id AND c.status = 'playing' AND c.is_captain
       AND c.team IN ('a', 'b')
       AND v_throws ->> c.user_id::text IS NULL
  ) THEN
    PERFORM public.tb_resolve_rps(v_state);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_submit_rps(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_submit_rps(uuid, text) TO authenticated;

-- A team's gesture is its captain's throw; the dice only cover a captain
-- who never threw (or an all-bot team, whose captain is a bot).
CREATE OR REPLACE FUNCTION public.tb_team_throw(p_room_id uuid, p_throws jsonb, p_team text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p_throws ->> rp.user_id::text
       FROM public.room_participants rp
      WHERE rp.room_id = p_room_id AND rp.team = p_team
        AND rp.status = 'playing' AND rp.is_captain
        AND p_throws ? rp.user_id::text
      LIMIT 1),
    (ARRAY['rock', 'paper', 'scissors'])[1 + floor(random() * 3)::int]);
$$;

REVOKE ALL ON FUNCTION public.tb_team_throw(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
