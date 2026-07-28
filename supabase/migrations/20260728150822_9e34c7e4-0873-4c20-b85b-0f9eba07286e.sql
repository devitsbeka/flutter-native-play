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

  v_required_ms := (GREATEST(p_question_time, 5) * 1000) + 700;
  v_elapsed_ms := EXTRACT(EPOCH FROM (now() - v_session.question_start_time)) * 1000;

  IF v_elapsed_ms < v_required_ms THEN
    RETURN jsonb_build_object('expired', false, 'reason', 'too_early',
      'elapsed_ms', round(v_elapsed_ms), 'required_ms', v_required_ms);
  END IF;

  UPDATE tv_sessions
     SET status = 'reveal',
         reveal_start_time = now()
   WHERE id = p_session_id
     AND status IN ('playing', 'question')
     AND current_question_index = v_session.current_question_index;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('expired', false, 'reason', 'lost_race');
  END IF;

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

GRANT SELECT ON public.tv_phase_events TO anon, authenticated;
GRANT ALL ON public.tv_phase_events TO service_role;

ALTER TABLE public.tv_phase_events ENABLE ROW LEVEL SECURITY;

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