-- submit_tv_answer trusted the caller completely: whatever points and
-- whatever player_id it was told, it wrote. It has to be anon-executable —
-- the TV display itself is never signed in — but "anyone may call this
-- without an account" was never meant to mean "anyone may pay any player any
-- amount they name." Confirmed live: a single call with p_points 999000000
-- was accepted verbatim, and a call naming a real OTHER player's p_player_id
-- credited that player 5,000,000 points from an attacker's own session, who
-- never touched their own client for it.
--
-- Two independent gaps, closed together because the second fix's roster-heal
-- branch is where the first one's identity check has to live:
--
-- 1. POINTS WERE NEVER RECOMPUTED. p_is_correct and p_points came straight
--    from the caller. Fixed by reading the question's own correct_answer out
--    of tv_sessions.questions (already locked under FOR UPDATE two lines
--    up) and computing points from the same formula everywhere else in the
--    app uses (BASE_POINTS + secondsRemaining*10, scoring.ts) — the client's
--    p_is_correct/p_points are still accepted as parameters (older/newer
--    client skew during a rollout should not hard-break answering) but are
--    no longer trusted for anything that pays out.
--
-- 2. p_player_id WAS NEVER BOUND TO THE CALLER. A signed-in caller (the
--    host, or any player who happens to be logged in) has auth.uid() to
--    prove who they are — the fix there is just to require p_player_id to
--    match it, which costs nothing new. A guest has no auth.uid() at all
--    (TV mode's controller join never calls signInAnonymously), so there is
--    no free identity to check. The fix is a per-player secret the CLIENT
--    already holds: tv_players.answer_token, generated client-side
--    alongside the player_id itself (getOrCreatePlayerId) and sent on every
--    submit_tv_answer call. A guest player_id's row is trust-on-first-use —
--    whichever token first answers under a given (session, player_id)
--    becomes the one required from then on, so a stranger who later learns
--    or guesses that player_id still cannot submit as them without the
--    token nobody but that player's own device was ever given. This is the
--    same trust model player_id itself already relies on (a client-picked
--    random UUID, believed because nothing forges it in practice) extended
--    one step to also cover WHO gets to act as that id, not just what the
--    id is.
--
-- The roster self-heal from 20260729000000_submit_answer_heals_roster.sql
-- also had its own bug, found while fixing this: it wrote v_player_uuid
-- into tv_players.user_id unconditionally, but user_id REFERENCES
-- auth.users(id) and a guest's player_id (crypto.randomUUID()) is never a
-- row there — so the exact guest case that migration says it heals hard-
-- fails with a foreign key violation (23503) instead. Fixed by writing
-- auth.uid() (null for a guest, matching how joinSession's own normal
-- insert already does it) rather than the untrusted p_player_id cast.

-- tv_players.is_active is read and written throughout TVGameContext.tsx and
-- both functions below, but grepping every migration in this repo for its
-- definition finds nothing — it was added directly against the live
-- database at some point, never through a committed migration. That made
-- this fix impossible to verify against a from-scratch local database (the
-- column simply does not exist there), which is itself worth recording
-- properly rather than working around quietly. IF NOT EXISTS makes this a
-- no-op against the real database, which already has the column.
ALTER TABLE public.tv_players
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.tv_players
  ADD COLUMN IF NOT EXISTS answer_token uuid NOT NULL DEFAULT gen_random_uuid();

DROP FUNCTION IF EXISTS public.submit_tv_answer(uuid, text, integer, text, boolean, integer, integer, text, text);

CREATE OR REPLACE FUNCTION public.submit_tv_answer(
  p_session_id uuid, p_player_id text, p_question_index integer,
  p_answer text, p_is_correct boolean, p_points integer, p_time_remaining integer,
  p_nickname text DEFAULT NULL, p_avatar_url text DEFAULT NULL,
  p_answer_token uuid DEFAULT NULL
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
  v_stored_token uuid;
  v_row_exists boolean;
  v_correct_answer text;
  v_is_correct boolean;
  v_points integer;
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

  -- WHO IS ALLOWED TO ANSWER AS p_player_id.
  --
  -- Signed in: auth.uid() is unforgeable, so p_player_id must simply be it
  -- (getOrCreatePlayerId already returns auth.uid() itself for a signed-in
  -- caller — a mismatch here means someone is trying to answer as a player
  -- id that is not their own account).
  --
  -- Not signed in: there is no free identity, so the row's own
  -- answer_token is the proof. A row that does not exist yet has no token
  -- to check against — this caller is about to create it below, becoming
  -- whoever presents a token for that player_id from now on.
  SELECT answer_token INTO v_stored_token
    FROM tv_players WHERE tv_session_id = p_session_id AND player_id = p_player_id;
  v_row_exists := FOUND;

  IF auth.uid() IS NOT NULL THEN
    IF v_player_uuid IS DISTINCT FROM auth.uid() THEN
      INSERT INTO tv_answer_rejections (tv_session_id, player_id, attempted_index, reason)
      VALUES (p_session_id, p_player_id, p_question_index, 'player_id_mismatch');
      RETURN jsonb_build_object('accepted', false, 'reason', 'player_id_mismatch');
    END IF;
  ELSIF v_row_exists AND (v_stored_token IS NULL OR v_stored_token IS DISTINCT FROM p_answer_token) THEN
    INSERT INTO tv_answer_rejections (tv_session_id, player_id, attempted_index, reason)
    VALUES (p_session_id, p_player_id, p_question_index, 'bad_answer_token');
    RETURN jsonb_build_object('accepted', false, 'reason', 'bad_answer_token');
  END IF;

  -- HEAL A MISSING ROSTER ROW. Answering means being in the game; if there is
  -- no row, scoring below would silently do nothing for the rest of the
  -- match. Only ever creates a row for a caller that supplied a real
  -- nickname — a made-up one would become a ghost player on the displays.
  -- user_id is auth.uid() (null for a guest), never the untrusted
  -- p_player_id cast — that was the foreign-key bug described above.
  v_nickname := NULLIF(btrim(COALESCE(p_nickname, '')), '');
  IF v_nickname IS NOT NULL AND NOT v_row_exists THEN
    INSERT INTO tv_players (
      tv_session_id, user_id, player_id, nickname, avatar_url,
      is_host, is_active, current_round_score, answer_token
    ) VALUES (
      p_session_id, auth.uid(), p_player_id, v_nickname, p_avatar_url,
      false, true, 0, COALESCE(p_answer_token, gen_random_uuid())
    )
    ON CONFLICT (tv_session_id, player_id) DO NOTHING;
    v_repaired := FOUND;
  END IF;

  -- SCORE FROM THE SERVER'S OWN RECORD OF THE QUESTION, not from what the
  -- caller claims. tv_sessions.questions is the same array the client reads
  -- to render the question, already locked under FOR UPDATE above.
  v_correct_answer := v_session.questions -> p_question_index ->> 'correct_answer';
  v_is_correct := v_correct_answer IS NOT NULL AND p_answer = v_correct_answer;
  v_points := CASE WHEN v_is_correct
    THEN 100 + round(LEAST(GREATEST(p_time_remaining, 0), 15)) * 10
    ELSE 0
  END;

  SELECT pa.points_earned INTO v_prev_points FROM player_answers pa
   WHERE pa.tv_session_id = p_session_id AND pa.user_id = v_player_uuid
     AND pa.question_index = p_question_index;

  INSERT INTO player_answers (
    tv_session_id, room_id, user_id, question_index,
    answer, is_correct, points_earned, time_remaining
  ) VALUES (
    p_session_id, v_session.room_id, v_player_uuid, p_question_index,
    p_answer, v_is_correct, v_points, p_time_remaining
  )
  ON CONFLICT (tv_session_id, user_id, question_index) DO UPDATE SET
    answer = EXCLUDED.answer, is_correct = EXCLUDED.is_correct,
    points_earned = EXCLUDED.points_earned, time_remaining = EXCLUDED.time_remaining;

  UPDATE tv_players tp
     SET current_round_score = GREATEST(0,
           COALESCE(tp.current_round_score, 0) - COALESCE(v_prev_points, 0) + v_points)
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
    v_points, v_is_correct, v_prev_points, v_new_total, v_new_total IS NULL
  );

  RETURN jsonb_build_object(
    'accepted', true, 'all_answered', v_all, 'transitioned', v_transitioned,
    'expected_ids', to_jsonb(v_expected), 'answered_ids', to_jsonb(v_answered),
    'question_index', p_question_index, 'room_id', v_session.room_id,
    'player_total', v_new_total, 'observer_bonus', v_bonus,
    'is_correct', v_is_correct, 'points', v_points,
    -- true when this call had to create the caller's missing roster row;
    -- surfaced so the repair is observable rather than silent
    'roster_repaired', v_repaired,
    'live_status', CASE WHEN v_transitioned THEN 'reveal' ELSE v_session.status END,
    'committed_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tv_answer(
  uuid, text, integer, text, boolean, integer, integer, text, text, uuid
) TO anon, authenticated;

-- A player who joins mid-question is inserted is_active = false on purpose
-- (joinSession) so they cannot retroactively affect the question already in
-- progress — the comment there says they are "marked inactive until the
-- next question." Nothing ever did that flip. confirmActivePlayers(), the
-- only code that reactivates a present player, runs in the HOST CLIENT's
-- reveal -> next-question transition (TVGameContext.tsx prepareForPlaying),
-- but 20260728170000_server_advances_question.sql moved that exact
-- transition into this function specifically so any device can win the
-- race first — and in practice the server call (polled every ~700ms by
-- every device) wins essentially every time, leaving the host-side
-- reactivation dead in the common case. Confirmed live: is_active stayed
-- false through a full question advance with no natural rejoin.
--
-- The fix does not need presence data (which a SQL function cannot see
-- anyway) — "until the next question" already says exactly when this
-- should happen: unconditionally, the moment a genuinely NEW question
-- starts, for anyone still seated. Run before counting active players so
-- the reactivated players are included in this question's own count.
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

  -- Only ever acts on a live reveal
  IF v_session.status <> 'reveal' OR v_session.reveal_start_time IS NULL THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'not_in_reveal',
                              'status', v_session.status);
  END IF;

  -- Did anyone answer this question? (correct or not - both count)
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

  -- Round end stays with the host (queue consumption + question fetching)
  IF v_total_questions = 0 OR v_next >= v_total_questions THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'round_end',
      'next_index', v_next, 'total', v_total_questions);
  END IF;

  -- Clear the finished question's answers, exactly as prepareForPlaying did
  DELETE FROM player_answers WHERE tv_session_id = p_session_id;

  -- A new question starts now: anyone who joined mid-question and was
  -- parked inactive for it is caught up as of this question.
  UPDATE tv_players
     SET is_active = true
   WHERE tv_session_id = p_session_id
     AND is_active = false
     AND player_id NOT IN ('TV_DISPLAY', 'TV_MIRROR');

  SELECT count(*) INTO v_active
  FROM tv_players tp
  WHERE tp.tv_session_id = p_session_id
    AND tp.is_active = true
    AND tp.player_id NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND COALESCE(tp.nickname, '') NOT IN ('TV_DISPLAY', 'TV_MIRROR')
    AND (v_session.current_round_suggester_id IS NULL
         OR tp.player_id <> v_session.current_round_suggester_id);

  -- CAS on the reveal's own index: a second caller (or the host's client
  -- doing the same thing) matches nothing and no-ops. Exactly once.
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
