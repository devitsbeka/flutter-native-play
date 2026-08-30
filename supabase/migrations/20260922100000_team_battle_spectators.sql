-- Team Battle spectators: teammates watching a rapid-fire turn could count
-- the answers landing but not SEE them — which option the spotlight player
-- tapped, whether it was right, and what it paid. The product spec says the
-- room watches the turn, so the state row now carries the last answer and
-- every submit broadcasts it over the realtime channel the room already
-- holds.
--
-- Only what a teammate could learn seconds later anyway (the tile's
-- points_earned and correct_count already update per answer) — no new
-- information leaks, it just arrives while it is still a moment.

ALTER TABLE public.team_battle_state
  ADD COLUMN IF NOT EXISTS last_answer jsonb;

-- Same body as 20260917100000, plus the last_answer write. Cleared when a
-- new tile is picked so a stale flash can't bleed into the next turn.
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
         last_answer = jsonb_build_object(
           'tile_id', v_tile.id,
           'question_index', p_question_index,
           'user_id', v_caller,
           'option', p_answer,
           'correct', v_correct,
           'points', v_points),
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

-- tb_pick_tile is untouched, but a fresh turn must not open under the
-- previous turn's flash: clear it whenever a tile is picked, riding the
-- same state update, via trigger-free redefinition being overkill — a
-- lightweight trigger keeps the 20260917 function intact.
CREATE OR REPLACE FUNCTION public.tb_clear_last_answer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.active_tile IS DISTINCT FROM OLD.active_tile THEN
    NEW.last_answer := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tb_clear_last_answer_on_tile_change ON public.team_battle_state;
CREATE TRIGGER tb_clear_last_answer_on_tile_change
  BEFORE UPDATE ON public.team_battle_state
  FOR EACH ROW
  EXECUTE FUNCTION public.tb_clear_last_answer();
