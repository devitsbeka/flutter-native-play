-- TV mode: atomic answer submission + all-answered decision + exactly-once
-- transition to reveal, decided in the database instead of on any client.
--
-- The client-side flow raced: "all answered" checks ran on devices with
-- stale local state, lagging devices submitted answers under old question
-- indices, and the host's timer could advance a question that was already
-- advancing. This function makes the committed database row the single
-- source of truth: every submission locks the session row, upserts the
-- answer, computes the all-answered decision from committed rows only, and
-- performs the reveal transition at most once (CAS on status + index).

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
  v_expected text[];
  v_answered text[];
  v_all boolean := false;
  v_transitioned boolean := false;
BEGIN
  -- Row lock serializes concurrent submissions for the same session, making
  -- the all-answered decision atomic and the transition exactly-once
  SELECT * INTO v_session FROM tv_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'session_not_found');
  END IF;

  -- A tap for a question that is no longer live (device showing a stale
  -- screen) must not be recorded - the client resyncs instead. A valid
  -- answer landing during this question's reveal is still accepted (two
  -- players tying for last place serialize on the row lock).
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
    p_session_id, v_session.room_id, p_player_id, p_question_index,
    p_answer, p_is_correct, p_points, p_time_remaining
  )
  ON CONFLICT (tv_session_id, user_id, question_index) DO UPDATE SET
    answer = EXCLUDED.answer,
    is_correct = EXCLUDED.is_correct,
    points_earned = EXCLUDED.points_earned,
    time_remaining = EXCLUDED.time_remaining;

  -- Expected = distinct ACTIVE non-system players (the round suggester skips)
  SELECT COALESCE(array_agg(DISTINCT tp.player_id), ARRAY[]::text[])
    INTO v_expected
  FROM tv_players tp
  WHERE tp.tv_session_id = p_session_id
    AND tp.is_active = true
    AND tp.player_id NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND COALESCE(tp.nickname, '') NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND (v_session.current_round_suggester_id IS NULL
         OR tp.player_id <> v_session.current_round_suggester_id);

  -- Submitted = distinct player ids with a committed row for THIS question
  SELECT COALESCE(array_agg(DISTINCT pa.user_id), ARRAY[]::text[])
    INTO v_answered
  FROM player_answers pa
  WHERE pa.tv_session_id = p_session_id
    AND pa.question_index = p_question_index;

  -- All answered = every expected id is contained in the answered set
  v_all := array_length(v_expected, 1) IS NOT NULL
           AND v_expected <@ v_answered;

  -- Exactly-once transition, only from a live question of this exact index
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
