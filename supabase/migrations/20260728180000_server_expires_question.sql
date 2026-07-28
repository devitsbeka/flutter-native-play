-- The LAST single point of failure in the question loop: the 15s timer.
--
-- We already moved both fast transitions off the host's phone:
--   * question -> reveal when everyone answered  -> submit_tv_answer
--   * reveal   -> next question                  -> tv_advance_question
--
-- But the SLOW path was never moved. When somebody does NOT answer, the only
-- thing that ends the question is the host phone's local 1-second
-- setInterval calling advanceToReveal(). That is client-side, decrement-based
-- (not derived from question_start_time), and one device deep:
--   * a phone that dims/backgrounds throttles setInterval to >= 1s per tick
--   * every re-render of the effect restarts the 1000ms phase
--   * if the host's tick is missed entirely, the ONLY backstop is the host's
--     5-second heartbeat, which does not even look until elapsed > 20s
-- So a question that should end at 15s ends somewhere in 15-25s, and which
-- one you get depends on how tired the host's phone is - i.e. it gets worse
-- the longer the game runs. That is exactly the reported symptom: the first
-- questions are snappy, then "we wait a little too much" on question 4-5.
--
-- Same cure as the other two: the DATABASE decides, every device may ask,
-- the row lock + CAS make it exactly-once. The TV is mains-powered and never
-- throttles, so the question always ends on time even if every phone stalls.
--
-- The client's local timer stays as a first asker; it just no longer OWNS
-- the transition. A device whose clock is skewed early gets 'too_early' and
-- asks again a second later - the server's now() is the only judge.

CREATE OR REPLACE FUNCTION public.tv_expire_question(
  p_session_id uuid,
  p_question_time integer DEFAULT 15
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session tv_sessions%ROWTYPE;
  v_elapsed_ms numeric;
  v_required_ms integer;
  v_bonus jsonb := NULL;
BEGIN
  SELECT * INTO v_session FROM tv_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('expired', false, 'reason', 'session_not_found');
  END IF;

  IF v_session.status NOT IN ('playing', 'question') OR v_session.question_start_time IS NULL THEN
    RETURN jsonb_build_object('expired', false, 'reason', 'not_in_question',
                              'status', v_session.status);
  END IF;

  -- Devices render the new question slightly after question_start_time, so a
  -- small grace keeps the server from cutting a player off a beat before
  -- their own screen says 0. Kept short - this is the ceiling, not the norm.
  v_required_ms := (GREATEST(p_question_time, 5) * 1000) + 700;
  v_elapsed_ms := EXTRACT(EPOCH FROM (now() - v_session.question_start_time)) * 1000;

  IF v_elapsed_ms < v_required_ms THEN
    RETURN jsonb_build_object('expired', false, 'reason', 'too_early',
      'elapsed_ms', round(v_elapsed_ms), 'required_ms', v_required_ms);
  END IF;

  -- CAS on this exact live question: a second asker (or the host's own
  -- advanceToReveal) matches nothing and no-ops. Exactly once.
  UPDATE tv_sessions
     SET status = 'reveal',
         reveal_start_time = now()
   WHERE id = p_session_id
     AND status IN ('playing', 'question')
     AND current_question_index = v_session.current_question_index;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('expired', false, 'reason', 'lost_race');
  END IF;

  -- Parity with advanceToReveal / submit_tv_answer: the observer bonus is
  -- evaluated on EVERY question->reveal transition. Idempotent by ledger.
  IF v_session.current_round_suggester_id IS NOT NULL THEN
    v_bonus := public.award_tv_observer_bonus(p_session_id, v_session.current_question_index);
  END IF;

  RETURN jsonb_build_object('expired', true,
    'question_index', v_session.current_question_index,
    'waited_ms', round(v_elapsed_ms),
    'observer_bonus', v_bonus);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tv_expire_question(uuid, integer) TO anon, authenticated;


-- ---------------------------------------------------------------------------
-- TELEMETRY: every phase transition, timestamped by the database.
--
-- Per-question timing has been reconstructed by guesswork so far, because
-- player_answers are deleted on advance and nothing else survives a game.
-- A trigger on tv_sessions captures EVERY transition regardless of who wrote
-- it (RPC, host client, TV), so the next play-test yields exact numbers:
-- how long each question really ran, how long each reveal really lasted, and
-- which writer performed the move.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tv_phase_events (
  id                  bigserial PRIMARY KEY,
  tv_session_id       uuid NOT NULL,
  question_index      integer,
  from_status         text,
  to_status           text,
  question_start_time timestamptz,
  reveal_start_time   timestamptz,
  answer_count        integer,
  at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tv_phase_events_session_idx
  ON public.tv_phase_events (tv_session_id, at);

ALTER TABLE public.tv_phase_events ENABLE ROW LEVEL SECURITY;

-- Readable for diagnosis; only the trigger below writes it.
DROP POLICY IF EXISTS "Anyone can read phase events" ON public.tv_phase_events;
CREATE POLICY "Anyone can read phase events"
  ON public.tv_phase_events FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.log_tv_session_phase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_answers integer := NULL;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.current_question_index IS NOT DISTINCT FROM OLD.current_question_index THEN
    RETURN NEW;
  END IF;

  -- Only meaningful on a reveal: how many answers actually landed for the
  -- question that just ended. This is the number that decides 1.4s vs 10s.
  IF NEW.status = 'reveal' THEN
    SELECT count(*) INTO v_answers
    FROM player_answers pa
    WHERE pa.tv_session_id = NEW.id
      AND pa.question_index = NEW.current_question_index;
  END IF;

  INSERT INTO tv_phase_events (
    tv_session_id, question_index, from_status, to_status,
    question_start_time, reveal_start_time, answer_count
  ) VALUES (
    NEW.id, NEW.current_question_index, OLD.status, NEW.status,
    NEW.question_start_time, NEW.reveal_start_time, v_answers
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tv_sessions_phase_log ON public.tv_sessions;
CREATE TRIGGER tv_sessions_phase_log
  AFTER UPDATE ON public.tv_sessions
  FOR EACH ROW EXECUTE FUNCTION public.log_tv_session_phase();
