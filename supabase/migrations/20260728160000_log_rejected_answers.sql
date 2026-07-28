-- DIAGNOSTIC: record every answer the server REJECTS.
--
-- Symptom under investigation: players report "we all answered" yet the
-- question runs the full 15s timer. That happens when a submission never
-- becomes a committed row - and today a rejected submission vanishes
-- silently (the client clears it and resyncs), leaving no evidence.
--
-- submit_tv_answer already refuses a tap whose question index doesn't match
-- the live one (a device showing a stale screen). This records those
-- refusals so we can see WHOSE device was behind, by HOW MUCH, and how
-- often - turning the next play-test into evidence instead of a guess.
--
-- Cheap: one small insert only on the rejection path; nothing on success.

CREATE TABLE IF NOT EXISTS public.tv_answer_rejections (
  id              bigserial PRIMARY KEY,
  tv_session_id   uuid NOT NULL,
  player_id       text NOT NULL,
  attempted_index integer NOT NULL,
  live_index      integer,
  live_status     text,
  reason          text NOT NULL,
  rejected_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tv_answer_rejections_session_idx
  ON public.tv_answer_rejections (tv_session_id, rejected_at DESC);

ALTER TABLE public.tv_answer_rejections ENABLE ROW LEVEL SECURITY;

-- Readable for diagnosis; only the SECURITY DEFINER function writes it.
DROP POLICY IF EXISTS "Anyone can read answer rejections" ON public.tv_answer_rejections;
CREATE POLICY "Anyone can read answer rejections"
  ON public.tv_answer_rejections FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.submit_tv_answer(
  p_session_id uuid, p_player_id text, p_question_index integer,
  p_answer text, p_is_correct boolean, p_points integer, p_time_remaining integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session tv_sessions%ROWTYPE;
  v_player_uuid uuid;
  v_prev_points integer;
  v_new_total integer;
  v_expected text[];
  v_answered text[];
  v_all boolean := false;
  v_transitioned boolean := false;
  v_bonus jsonb := NULL;
BEGIN
  BEGIN
    v_player_uuid := p_player_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    INSERT INTO tv_answer_rejections (tv_session_id, player_id, attempted_index, reason)
    VALUES (p_session_id, p_player_id, p_question_index, 'invalid_player_id');
    RETURN jsonb_build_object('accepted', false, 'reason', 'invalid_player_id');
  END;

  SELECT * INTO v_session FROM tv_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO tv_answer_rejections (tv_session_id, player_id, attempted_index, reason)
    VALUES (p_session_id, p_player_id, p_question_index, 'session_not_found');
    RETURN jsonb_build_object('accepted', false, 'reason', 'session_not_found');
  END IF;

  IF v_session.current_question_index IS DISTINCT FROM p_question_index
     OR v_session.status NOT IN ('playing', 'question', 'reveal') THEN
    INSERT INTO tv_answer_rejections (
      tv_session_id, player_id, attempted_index, live_index, live_status, reason)
    VALUES (p_session_id, p_player_id, p_question_index,
            v_session.current_question_index, v_session.status, 'stale_question');
    RETURN jsonb_build_object('accepted', false, 'reason', 'stale_question',
      'live_question_index', v_session.current_question_index,
      'live_status', v_session.status);
  END IF;

  SELECT pa.points_earned INTO v_prev_points FROM player_answers pa
   WHERE pa.tv_session_id = p_session_id AND pa.user_id = v_player_uuid
     AND pa.question_index = p_question_index;

  INSERT INTO player_answers (
    tv_session_id, room_id, user_id, question_index,
    answer, is_correct, points_earned, time_remaining
  ) VALUES (
    p_session_id, v_session.room_id, v_player_uuid, p_question_index,
    p_answer, p_is_correct, p_points, p_time_remaining
  )
  ON CONFLICT (tv_session_id, user_id, question_index) DO UPDATE SET
    answer = EXCLUDED.answer, is_correct = EXCLUDED.is_correct,
    points_earned = EXCLUDED.points_earned, time_remaining = EXCLUDED.time_remaining;

  UPDATE tv_players tp
     SET current_round_score = GREATEST(0,
           COALESCE(tp.current_round_score, 0) - COALESCE(v_prev_points, 0) + COALESCE(p_points, 0))
   WHERE tp.tv_session_id = p_session_id AND tp.player_id = p_player_id
  RETURNING tp.current_round_score INTO v_new_total;

  SELECT COALESCE(array_agg(DISTINCT tp.player_id), ARRAY[]::text[]) INTO v_expected
  FROM tv_players tp
  WHERE tp.tv_session_id = p_session_id AND tp.is_active = true
    AND tp.player_id NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND COALESCE(tp.nickname, '') NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND (v_session.current_round_suggester_id IS NULL
         OR tp.player_id <> v_session.current_round_suggester_id);

  SELECT COALESCE(array_agg(DISTINCT pa.user_id::text), ARRAY[]::text[]) INTO v_answered
  FROM player_answers pa
  WHERE pa.tv_session_id = p_session_id AND pa.question_index = p_question_index;

  v_all := array_length(v_expected, 1) IS NOT NULL AND v_expected <@ v_answered;

  IF v_all AND v_session.status IN ('playing', 'question') THEN
    UPDATE tv_sessions SET status = 'reveal', reveal_start_time = now()
     WHERE id = p_session_id AND status IN ('playing', 'question')
       AND current_question_index = p_question_index;
    v_transitioned := FOUND;

    IF v_transitioned AND v_session.current_round_suggester_id IS NOT NULL THEN
      v_bonus := public.award_tv_observer_bonus(p_session_id, p_question_index);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'accepted', true, 'all_answered', v_all, 'transitioned', v_transitioned,
    'expected_ids', to_jsonb(v_expected), 'answered_ids', to_jsonb(v_answered),
    'question_index', p_question_index, 'room_id', v_session.room_id,
    'player_total', v_new_total, 'observer_bonus', v_bonus,
    'live_status', CASE WHEN v_transitioned THEN 'reveal' ELSE v_session.status END,
    'committed_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tv_answer(uuid, text, integer, text, boolean, integer, integer)
  TO anon, authenticated;
