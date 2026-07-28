CREATE OR REPLACE FUNCTION public.tv_advance_question(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session tv_sessions%ROWTYPE;
  v_answer_count integer := 0;
  v_required_ms integer;
  v_elapsed_ms numeric;
  v_total_questions integer;
  v_next integer;
  v_active integer;
BEGIN
  SELECT * INTO v_session FROM tv_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'session_not_found');
  END IF;

  IF v_session.status <> 'reveal' OR v_session.reveal_start_time IS NULL THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'not_in_reveal',
                              'status', v_session.status);
  END IF;

  SELECT count(*) INTO v_answer_count
  FROM player_answers pa
  WHERE pa.tv_session_id = p_session_id
    AND pa.question_index = v_session.current_question_index;

  v_required_ms := CASE WHEN v_answer_count > 0 THEN 1400 ELSE 10000 END;
  v_elapsed_ms := EXTRACT(EPOCH FROM (now() - v_session.reveal_start_time)) * 1000;

  IF v_elapsed_ms < v_required_ms THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'too_early',
      'elapsed_ms', round(v_elapsed_ms), 'required_ms', v_required_ms,
      'answers', v_answer_count);
  END IF;

  v_total_questions := COALESCE(jsonb_array_length(v_session.questions), 0);
  v_next := v_session.current_question_index + 1;

  IF v_total_questions = 0 OR v_next >= v_total_questions THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'round_end',
      'next_index', v_next, 'total', v_total_questions);
  END IF;

  DELETE FROM player_answers WHERE tv_session_id = p_session_id;

  SELECT count(*) INTO v_active
  FROM tv_players tp
  WHERE tp.tv_session_id = p_session_id
    AND tp.is_active = true
    AND tp.player_id NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND COALESCE(tp.nickname, '') NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND (v_session.current_round_suggester_id IS NULL
         OR tp.player_id <> v_session.current_round_suggester_id);

  UPDATE tv_sessions
     SET status = 'playing',
         current_question_index = v_next,
         question_start_time = now(),
         reveal_start_time = null,
         active_player_count = GREATEST(v_active, 1)
   WHERE id = p_session_id
     AND status = 'reveal'
     AND current_question_index = v_session.current_question_index;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'lost_race');
  END IF;

  RETURN jsonb_build_object('advanced', true, 'next_index', v_next,
    'answers', v_answer_count, 'active', v_active,
    'waited_ms', round(v_elapsed_ms));
END;
$$;

GRANT EXECUTE ON FUNCTION public.tv_advance_question(uuid) TO anon, authenticated;