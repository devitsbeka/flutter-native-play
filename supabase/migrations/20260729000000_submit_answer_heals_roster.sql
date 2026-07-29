-- ---------------------------------------------------------------------------
-- SCORE TELEMETRY - because "some players' points were stuck" cannot be
-- answered from the current schema at all.
--
-- tv_players.current_round_score holds only the latest value, and
-- player_answers is deleted on every advance, so after a game there is no
-- record of how anyone's score moved. Diagnosing a stuck score today means
-- guessing.
--
-- One row per accepted answer, written inside the same transaction that
-- scores it: who, which round and question, what the answer was worth, and
-- the running total the server returned. That makes the next game's scoring
-- fully reconstructible - exactly how the phase log settled the pacing bug.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tv_score_events (
  id             bigserial PRIMARY KEY,
  tv_session_id  uuid NOT NULL,
  player_id      text NOT NULL,
  nickname       text,
  round_number   integer,
  question_index integer NOT NULL,
  points         integer,
  is_correct     boolean,
  prev_points    integer,
  running_total  integer,
  roster_missing boolean NOT NULL DEFAULT false,
  at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tv_score_events_session_idx
  ON public.tv_score_events (tv_session_id, at);

ALTER TABLE public.tv_score_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read score events" ON public.tv_score_events;
CREATE POLICY "Anyone can read score events"
  ON public.tv_score_events FOR SELECT USING (true);
-- No write policy: only the SECURITY DEFINER function below inserts.


-- Reported: "some players' points were stuck for several rounds."
--
-- WHAT THE DATA ACTUALLY SHOWS (session e380b5f3, six players):
--
-- All six players - TriviaMaste, beka, tunano, eko, Natalia K., Giorgi K. -
-- DO have tv_players rows, all with non-zero scores. So the reported symptom
-- is NOT explained by anything in this file, and this migration should not be
-- read as fixing it. The telemetry at the bottom is what will.
--
-- What the data DID turn up is a real, separate hole. Two further player_ids
-- (d4157a3e, ea5355ab) submitted answers to that session while having no
-- tv_players row at all. For such a caller, this function does:
--
--   UPDATE tv_players SET current_round_score = ...
--    WHERE tv_session_id = ... AND player_id = p_player_id
--   RETURNING current_round_score INTO v_new_total;
--
-- No row, so the UPDATE matches nothing and v_new_total stays NULL. The
-- answer is still written and the tap still accepted, so the player sees the
-- question and the reveal - and their score never moves. The client fallback
-- (persistScore) writes current_round_score directly, which the score-column
-- lockdown now refuses, so nothing catches it. They are also missing from
-- v_expected, so the room never waits for them, and from every results
-- screen, which reads the roster.
--
-- The roster row goes missing because joinSession swallows the failure:
--
--   if (insertError) {
--     // Log but don't fail - presence will still work
--     console.warn('[joinSession] Failed to insert tv_player:', insertError);
--   }
--
-- One failed INSERT at join time and that player is a ghost for the whole
-- game. Retrying on the client cannot be trusted - whatever made the insert
-- fail may still be true, and by then the game has started.
--
-- So the server heals it. A player who is answering IS in the game, by
-- definition; if the roster disagrees, the roster is wrong. The insert runs
-- under the session row lock already held above, so it cannot race.
--
-- Signature change: two optional parameters carry the identity needed to
-- create the row (nickname is NOT NULL on tv_players, and inventing one is
-- how ghost players appear - so a row is only created when a real nickname
-- is supplied). Defaults mean a client that has not shipped yet still calls
-- this successfully with the original seven arguments.

DROP FUNCTION IF EXISTS public.submit_tv_answer(uuid, text, integer, text, boolean, integer, integer);

CREATE OR REPLACE FUNCTION public.submit_tv_answer(
  p_session_id uuid, p_player_id text, p_question_index integer,
  p_answer text, p_is_correct boolean, p_points integer, p_time_remaining integer,
  p_nickname text DEFAULT NULL, p_avatar_url text DEFAULT NULL
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
  v_repaired boolean := false;
  v_nickname text;
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

  -- HEAL A MISSING ROSTER ROW. Answering means being in the game; if there is
  -- no row, scoring below would silently do nothing for the rest of the match.
  -- Only ever creates a row for a caller that supplied a real nickname -
  -- a made-up one would become a ghost player on the displays.
  v_nickname := NULLIF(btrim(COALESCE(p_nickname, '')), '');
  IF v_nickname IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM tv_players tp
       WHERE tp.tv_session_id = p_session_id AND tp.player_id = p_player_id
     ) THEN
    INSERT INTO tv_players (
      tv_session_id, user_id, player_id, nickname, avatar_url,
      is_host, is_active, current_round_score
    ) VALUES (
      p_session_id, v_player_uuid, p_player_id, v_nickname, p_avatar_url,
      false, true, 0
    )
    ON CONFLICT (tv_session_id, player_id) DO NOTHING;
    v_repaired := FOUND;
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

  -- Durable record of this scoring step (see tv_score_events below)
  INSERT INTO tv_score_events (
    tv_session_id, player_id, nickname, round_number, question_index,
    points, is_correct, prev_points, running_total, roster_missing
  ) VALUES (
    p_session_id, p_player_id, v_nickname, v_session.round_number, p_question_index,
    p_points, p_is_correct, v_prev_points, v_new_total, v_new_total IS NULL
  );

  RETURN jsonb_build_object(
    'accepted', true, 'all_answered', v_all, 'transitioned', v_transitioned,
    'expected_ids', to_jsonb(v_expected), 'answered_ids', to_jsonb(v_answered),
    'question_index', p_question_index, 'room_id', v_session.room_id,
    'player_total', v_new_total, 'observer_bonus', v_bonus,
    -- true when this call had to create the caller's missing roster row;
    -- surfaced so the repair is observable rather than silent
    'roster_repaired', v_repaired,
    'live_status', CASE WHEN v_transitioned THEN 'reveal' ELSE v_session.status END,
    'committed_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tv_answer(
  uuid, text, integer, text, boolean, integer, integer, text, text
) TO anon, authenticated;
