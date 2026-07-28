-- WHY A REVEAL EVERYONE ANSWERED STILL TOOK 10 SECONDS.
--
-- Measured live (tv_phase_events, session c154148e):
--
--   15:09:48.738  q=5  playing -> reveal   ans=2      <- both players answered
--   15:09:58.942  q=6  reveal  -> playing             <- 10.20s later
--
-- tv_advance_question picks the reveal length by COUNTING player_answers:
--   at least one answer -> 1.4s, nobody answered -> 10s reading time.
-- That count is taken when the advance is ASKED FOR, not when the reveal
-- STARTED - and in between, the host's client wipes the table.
--
-- The host's reveal -> next path calls prepareForPlaying(), whose very first
-- step is "DELETE FROM player_answers WHERE tv_session_id = ..." (all of
-- them), followed by a 300ms sleep and several more round trips before it
-- performs its own transition. So the sequence is:
--
--   t=0.0s  reveal starts, 2 answer rows exist
--   t=1.4s  host's advance() fires -> DELETEs every answer row
--   t=1.4s  a device nudges tv_advance_question -> counts 0 rows
--           -> "nobody answered" -> required wait becomes 10 SECONDS
--   t=10.2s the reveal finally ends
--
-- The trigger's ans=2 above is the proof: two answers existed at the moment
-- the reveal began, and the advance still waited the full reading-time
-- reveal. It is a race, which is why the first questions were fine (1.55s
-- each) and it only started biting at question 6.
--
-- FIX: stop deriving a decision about a MOMENT from a table that keeps
-- changing. Snapshot the answer count onto the session row at the instant
-- the reveal starts, and let tv_advance_question read the snapshot. A
-- BEFORE UPDATE trigger does the stamping, so it applies no matter who
-- performs the transition - submit_tv_answer, tv_expire_question, or the
-- host's own advanceToReveal - and no later DELETE from any client can
-- change the answer.
--
-- The companion client change stops the host from pre-wiping answers mid
-- reveal at all (tv_advance_question already deletes them atomically as
-- part of the advance), but this migration is what makes the timing
-- correct-by-construction rather than correct-if-nobody-races-us.

ALTER TABLE public.tv_sessions
  ADD COLUMN IF NOT EXISTS reveal_answer_count integer;

CREATE OR REPLACE FUNCTION public.stamp_tv_reveal_answer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.status = 'reveal' AND OLD.status IS DISTINCT FROM 'reveal' THEN
    -- Entering a reveal: freeze how many answers landed for the question
    -- that just ended. Runs inside the same transaction as the transition,
    -- so an answer that caused it is already visible here.
    SELECT count(*) INTO v_count
    FROM player_answers pa
    WHERE pa.tv_session_id = NEW.id
      AND pa.question_index = NEW.current_question_index;
    NEW.reveal_answer_count := v_count;
  ELSIF NEW.status IS DISTINCT FROM 'reveal' THEN
    -- Leaving the reveal: the snapshot belongs to that reveal only.
    NEW.reveal_answer_count := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tv_sessions_stamp_reveal_answers ON public.tv_sessions;
CREATE TRIGGER tv_sessions_stamp_reveal_answers
  BEFORE UPDATE ON public.tv_sessions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_tv_reveal_answer_count();


-- tv_advance_question now trusts the snapshot. The live count remains only
-- as a fallback for a reveal that began before this migration existed.
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

  -- Did anyone answer this question? (correct or not - both count.) Taken
  -- from the snapshot stamped when the reveal STARTED, so a client deleting
  -- answer rows mid-reveal can no longer turn a 1.4s reveal into a 10s one.
  IF v_session.reveal_answer_count IS NOT NULL THEN
    v_answer_count := v_session.reveal_answer_count;
  ELSE
    SELECT count(*) INTO v_answer_count
    FROM player_answers pa
    WHERE pa.tv_session_id = p_session_id
      AND pa.question_index = v_session.current_question_index;
  END IF;

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

  -- Clear the finished question's answers, exactly as prepareForPlaying did.
  -- This is the ONLY mid-round cleanup now, and it happens after the reveal
  -- length has already been decided from the snapshot.
  DELETE FROM player_answers WHERE tv_session_id = p_session_id;

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


-- Telemetry records the same snapshot, so the log shows the number the
-- advance decision was actually made on rather than a live re-count that
-- may already have been wiped.
CREATE OR REPLACE FUNCTION public.log_tv_session_phase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.current_question_index IS NOT DISTINCT FROM OLD.current_question_index THEN
    RETURN NEW;
  END IF;

  INSERT INTO tv_phase_events (
    tv_session_id, question_index, from_status, to_status,
    question_start_time, reveal_start_time, answer_count
  ) VALUES (
    NEW.id, NEW.current_question_index, OLD.status, NEW.status,
    NEW.question_start_time, NEW.reveal_start_time, NEW.reveal_answer_count
  );

  RETURN NEW;
END;
$$;
