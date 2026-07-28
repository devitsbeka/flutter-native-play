-- Tier 1 · 1.1 (broken feature) + Tier 0 · S-2 (score lockdown groundwork)
--
-- The suggester's observer bonus is computed inside the client's
-- advanceToReveal(). Since the DB started performing the question->reveal
-- transition (the common fast path), advanceToReveal no longer runs there,
-- so the bonus is silently NOT awarded on fast questions - it only lands
-- when the timer expires. Moving it server-side fixes that AND removes a
-- client-side score write, a prerequisite for locking the score column.
--
-- Scoring parity with src/utils/tvScoring.ts:
--   points = round(100 + clamp(timeRemaining, 0, 15) * 5)
--   observer bonus = same formula over the AVERAGE time remaining of the
--   players who answered wrong or not at all (non-answerers count as 0),
--   awarded only when MORE THAN HALF of the active non-suggester players
--   got it wrong. One bonus per question, not per player.

-- Idempotency ledger: one row per (session, question) the bonus was
-- evaluated for, so no combination of callers can double-award.
CREATE TABLE IF NOT EXISTS public.tv_observer_awards (
  tv_session_id  uuid    NOT NULL,
  question_index integer NOT NULL,
  suggester_id   text    NOT NULL,
  points         integer NOT NULL DEFAULT 0,
  awarded_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tv_session_id, question_index)
);

ALTER TABLE public.tv_observer_awards ENABLE ROW LEVEL SECURITY;
-- No client policies: only SECURITY DEFINER functions below touch this table.

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
    v_bonus := round(100 + LEAST(GREATEST(v_avg, 0), 15) * 5);

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

-- Score reset moves server-side too, so clients never need to write scores
-- (play-again / new game). Zeroes the whole session in one call.
CREATE OR REPLACE FUNCTION public.reset_tv_session_scores(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rows integer;
BEGIN
  UPDATE tv_players SET current_round_score = 0
   WHERE tv_session_id = p_session_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM tv_observer_awards WHERE tv_session_id = p_session_id;

  RETURN jsonb_build_object('reset', true, 'players', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_tv_session_scores(uuid) TO anon, authenticated;

-- Award the bonus at the moment the DB itself ends the question, so the fast
-- path is covered without depending on any client.
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
    RETURN jsonb_build_object('accepted', false, 'reason', 'invalid_player_id');
  END;

  SELECT * INTO v_session FROM tv_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'session_not_found');
  END IF;

  IF v_session.current_question_index IS DISTINCT FROM p_question_index
     OR v_session.status NOT IN ('playing', 'question', 'reveal') THEN
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
