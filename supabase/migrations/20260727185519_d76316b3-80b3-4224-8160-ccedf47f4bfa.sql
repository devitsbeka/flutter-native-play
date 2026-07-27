-- Round-start reset must affect ALL participants, but the RLS policy on
-- room_participants only lets each user update their own row, so the host's
-- client-side "reset everyone" writes silently no-op for other players
-- (stale finished/score state then corrupts follow-up rounds).
-- SECURITY DEFINER lets any room participant reset the round state atomically.
CREATE OR REPLACE FUNCTION public.reset_room_participants(
  p_room_id uuid,
  p_status text DEFAULT 'playing'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant of this room';
  END IF;

  IF p_status NOT IN ('joined', 'playing') THEN
    RAISE EXCEPTION 'invalid status %', p_status;
  END IF;

  UPDATE public.room_participants
  SET score = 0,
      current_question = 0,
      status = p_status,
      has_seen_results = false
  WHERE room_id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_room_participants(uuid, text) TO authenticated;

CREATE POLICY "Host can remove room participants"
ON public.room_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = room_participants.room_id
      AND gr.host_user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.increment_participant_score(
  p_room_id uuid,
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.room_participants
  SET score = GREATEST(0, score + p_delta)
  WHERE room_id = p_room_id
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_participant_score(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.adjust_power_up(p_type text, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_quantity integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
  VALUES (v_user_id, p_type, GREATEST(0, p_delta))
  ON CONFLICT (user_id, power_up_type)
  DO UPDATE SET quantity = GREATEST(0, user_power_ups.quantity + p_delta)
  RETURNING quantity INTO v_quantity;

  RETURN v_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_power_up(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_power_up(text, integer) TO authenticated;

CREATE POLICY "Participants can insert room games" ON public.room_games
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_games.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update room games" ON public.room_games
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_games.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert room questions" ON public.room_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_questions.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can delete room questions" ON public.room_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_questions.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert queue items" ON public.room_category_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_category_queue.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update queue items" ON public.room_category_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_category_queue.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can delete queue items" ON public.room_category_queue
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_category_queue.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can clear room answers" ON public.player_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = player_answers.room_id AND rp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can insert room games" ON public.room_games;
DROP POLICY IF EXISTS "Participants can update room games" ON public.room_games;
DROP POLICY IF EXISTS "Participants can insert room questions" ON public.room_questions;
DROP POLICY IF EXISTS "Participants can delete room questions" ON public.room_questions;
DROP POLICY IF EXISTS "Participants can insert queue items" ON public.room_category_queue;
DROP POLICY IF EXISTS "Participants can update queue items" ON public.room_category_queue;
DROP POLICY IF EXISTS "Participants can delete queue items" ON public.room_category_queue;
DROP POLICY IF EXISTS "Participants can clear room answers" ON public.player_answers;

CREATE POLICY "Host can clear room answers" ON public.player_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = player_answers.room_id
        AND gr.host_user_id = auth.uid()
    )
  );

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
    p_session_id, v_session.room_id, p_player_id, p_question_index,
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

  SELECT COALESCE(array_agg(DISTINCT pa.user_id), ARRAY[]::text[])
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