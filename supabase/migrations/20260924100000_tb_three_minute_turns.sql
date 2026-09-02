-- Three-minute turns: the clock is fixed, the question count is not.
--
-- A rapid-fire turn used to be `turn_seconds` (20..90, default 40) over a
-- tile of ~12 questions, and a tile stopped paying once its price was
-- earned. The owner's spec flips it: the spotlight player gets THREE
-- MINUTES and answers as many questions as they can — every correct answer
-- pays its slice (price / target_correct), with no cap at the tile's
-- nominal price. The client now ships ~40 questions per tile so a fast
-- player does not run dry; if they do, the turn simply ends early exactly
-- as before.
--
-- Both functions below are full redefinitions of the latest versions
-- (tb_start_match from 20260921210000, tb_submit_answer from 20260917),
-- with only the turn clamp/default and the payout cap changed.

CREATE OR REPLACE FUNCTION public.tb_start_match(
  p_room_id uuid,
  p_board jsonb,
  p_turn_seconds integer DEFAULT 180
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
  IF p_turn_seconds IS NULL OR p_turn_seconds < 20 OR p_turn_seconds > 180 THEN
    RAISE EXCEPTION 'Turn length must be between 20 and 180 seconds';
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
    -- No cap at the tile's price any more: a turn is a fixed three
    -- minutes and every further correct answer keeps paying its slice —
    -- speed is the skill the turn measures now.
    v_points := v_slice;
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

REVOKE ALL ON FUNCTION public.tb_start_match(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_start_match(uuid, jsonb, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.tb_submit_answer(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_submit_answer(uuid, integer, text) TO authenticated;
