-- Unified scoring policy: every live-answered question in every mode pays
--   points = round(100 + clamp(timeRemaining, 0, 15) * 10)
-- The client formulas (src/utils/scoring.ts) moved from the old TV rate of
-- ×5 to the app-wide ×10 rate; this brings the server-side observer bonus
-- into parity so the suggester scores on the same scale as the players.
-- Only the multiplier changes — claiming, idempotency and grants are
-- identical to 20260728140000_observer_bonus_server_side.sql.

CREATE OR REPLACE FUNCTION public.award_tv_observer_bonus(
  p_session_id uuid,
  p_question_index integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session tv_sessions%ROWTYPE;
  v_suggester text;
  v_active integer := 0;
  v_wrong integer := 0;
  v_avg numeric := 0;
  v_bonus integer := 0;
BEGIN
  SELECT * INTO v_session FROM tv_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'session_not_found');
  END IF;

  v_suggester := v_session.current_round_suggester_id;
  IF v_suggester IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'no_suggester');
  END IF;

  -- Claim this (session, question) exactly once
  INSERT INTO tv_observer_awards (tv_session_id, question_index, suggester_id, points)
  VALUES (p_session_id, p_question_index, v_suggester, 0)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'already_evaluated');
  END IF;

  -- Active, non-system, non-suggester players
  SELECT count(*) INTO v_active
  FROM tv_players tp
  WHERE tp.tv_session_id = p_session_id
    AND tp.is_active = true
    AND tp.player_id NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND COALESCE(tp.nickname, '') NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND tp.player_id <> v_suggester;

  -- Of those, the ones with no answer or a wrong answer; non-answerers
  -- contribute 0 to the time average (mirrors `answeredTimeRemaining ?? 0`)
  SELECT count(*), COALESCE(AVG(COALESCE(pa.time_remaining, 0)), 0)
    INTO v_wrong, v_avg
  FROM tv_players tp
  LEFT JOIN player_answers pa
         ON pa.tv_session_id = p_session_id
        AND pa.question_index = p_question_index
        AND pa.user_id::text = tp.player_id
  WHERE tp.tv_session_id = p_session_id
    AND tp.is_active = true
    AND tp.player_id NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND COALESCE(tp.nickname, '') NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND tp.player_id <> v_suggester
    AND COALESCE(pa.is_correct, false) = false;

  IF v_active > 0 AND v_wrong::numeric > (v_active::numeric / 2) THEN
    -- Unified rate: 100 base + 10/second (was 5/second)
    v_bonus := round(100 + LEAST(GREATEST(v_avg, 0), 15) * 10);

    UPDATE tv_players
       SET current_round_score = COALESCE(current_round_score, 0) + v_bonus
     WHERE tv_session_id = p_session_id
       AND player_id = v_suggester;

    UPDATE tv_observer_awards
       SET points = v_bonus
     WHERE tv_session_id = p_session_id AND question_index = p_question_index;

    RETURN jsonb_build_object('awarded', true, 'points', v_bonus,
      'wrong', v_wrong, 'active', v_active, 'avg_time', v_avg);
  END IF;

  RETURN jsonb_build_object('awarded', false, 'reason', 'majority_correct',
    'wrong', v_wrong, 'active', v_active);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_tv_observer_bonus(uuid, integer) TO anon, authenticated;
