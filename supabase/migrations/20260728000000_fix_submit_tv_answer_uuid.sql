-- FIX 1: player_answers.room_id was NOT NULL, so TV sessions created
-- directly on the TV (no room attached) could not store answers AT ALL on
-- any path - no fast advance, timer-only progression. TV answers are keyed
-- by tv_session_id; room_id is optional context.
ALTER TABLE public.player_answers ALTER COLUMN room_id DROP NOT NULL;

-- FIX 2: submit_tv_answer failed on EVERY real call with 42804 - the
-- player_answers.user_id column is uuid but the function inserted/compared
-- it as text. Every tap silently fell back to the legacy client path, so
-- the atomic flow never actually ran. Casts added; logic unchanged.

CREATE OR REPLACE FUNCTION public.submit_tv_answer(
  p_session_id uuid,
  p_player_id text,
  p_question_index integer,
  p_answer text,
  p_is_correct boolean,
  p_points integer,
  p_time_remaining integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session tv_sessions%ROWTYPE;
  v_player_uuid uuid;
  v_expected text[];
  v_answered text[];
  v_all boolean := false;
  v_transitioned boolean := false;
BEGIN
  -- Player ids are uuid-formatted strings; reject anything else cleanly
  BEGIN
    v_player_uuid := p_player_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'invalid_player_id');
  END;

  SELECT * INTO v_session FROM tv_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'session_not_found');
  END IF;

  IF v_session.current_question_index IS DISTINCT FROM p_question_index
     OR v_session.status NOT IN ('playing', 'question', 'reveal') THEN
    RETURN jsonb_build_object(
      'accepted', false,
      'reason', 'stale_question',
      'live_question_index', v_session.current_question_index,
      'live_status', v_session.status
    );
  END IF;

  INSERT INTO player_answers (
    tv_session_id, room_id, user_id, question_index,
    answer, is_correct, points_earned, time_remaining
  ) VALUES (
    p_session_id, v_session.room_id, v_player_uuid, p_question_index,
    p_answer, p_is_correct, p_points, p_time_remaining
  )
  ON CONFLICT (tv_session_id, user_id, question_index) DO UPDATE SET
    answer = EXCLUDED.answer,
    is_correct = EXCLUDED.is_correct,
    points_earned = EXCLUDED.points_earned,
    time_remaining = EXCLUDED.time_remaining;

  SELECT COALESCE(array_agg(DISTINCT tp.player_id), ARRAY[]::text[])
    INTO v_expected
  FROM tv_players tp
  WHERE tp.tv_session_id = p_session_id
    AND tp.is_active = true
    AND tp.player_id NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND COALESCE(tp.nickname, '') NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND (v_session.current_round_suggester_id IS NULL
         OR tp.player_id <> v_session.current_round_suggester_id);

  SELECT COALESCE(array_agg(DISTINCT pa.user_id::text), ARRAY[]::text[])
    INTO v_answered
  FROM player_answers pa
  WHERE pa.tv_session_id = p_session_id
    AND pa.question_index = p_question_index;

  v_all := array_length(v_expected, 1) IS NOT NULL
           AND v_expected <@ v_answered;

  IF v_all AND v_session.status IN ('playing', 'question') THEN
    UPDATE tv_sessions
       SET status = 'reveal', reveal_start_time = now()
     WHERE id = p_session_id
       AND status IN ('playing', 'question')
       AND current_question_index = p_question_index;
    v_transitioned := FOUND;
  END IF;

  RETURN jsonb_build_object(
    'accepted', true,
    'all_answered', v_all,
    'transitioned', v_transitioned,
    'expected_ids', to_jsonb(v_expected),
    'answered_ids', to_jsonb(v_answered),
    'question_index', p_question_index,
    'room_id', v_session.room_id,
    'live_status', CASE WHEN v_transitioned THEN 'reveal' ELSE v_session.status END,
    'committed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tv_answer(uuid, text, integer, text, boolean, integer, integer)
  TO anon, authenticated;
