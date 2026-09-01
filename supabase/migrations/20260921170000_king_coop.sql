-- MyTrivia King co-op: one team, one duel, the captain decides.
--
-- Until now the King lounge started PARALLEL solo duels — everyone in the
-- room fought their own King with their own questions. The owner's design
-- is a single shared match: one question on every screen at once, a shared
-- think minute, then teammates each tap the answer they believe in and the
-- captain — seeing where the votes cluster — locks one in as the team's
-- answer. Team point or King point; first to 6; every human on a winning
-- team is paid.
--
-- Server-authoritative like everything else here: the match row never
-- carries the correct answer, options exist only once the commit window is
-- open, and every write goes through a SECURITY DEFINER function. The row
-- IS readable by the room (SELECT policy) so realtime delivers phase
-- changes; the reveal (correct answer + explanation) lands in last_result
-- only after the question is resolved.
--
-- Timings: 60s to think, 20s to commit (co-op needs room to argue).
-- Deadlines are enforced by king_team_advance, pumped by any client, so a
-- sleeping captain never stalls the couch: at the commit deadline the
-- majority suggestion locks itself (captain's pick breaks ties, then the
-- alphabetically-first leader for determinism), and no suggestions at all
-- counts as a miss.

CREATE TABLE IF NOT EXISTS public.king_team_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  captain uuid NOT NULL,
  status text NOT NULL DEFAULT 'playing',
  team_score integer NOT NULL DEFAULT 0,
  king_score integer NOT NULL DEFAULT 0,
  question_ids uuid[] NOT NULL DEFAULT '{}',
  current_question_id uuid REFERENCES public.king_questions(id),
  drawn_at timestamptz,
  options jsonb,
  options_at timestamptz,
  suggestions jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_result jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS king_team_matches_one_playing
  ON public.king_team_matches (room_id) WHERE status = 'playing';

ALTER TABLE public.king_team_matches ENABLE ROW LEVEL SECURITY;

-- The room watches its own match; nothing secret ever sits in the row
-- (options appear only when the commit window opens for everyone anyway).
CREATE POLICY "Team watches its own match"
  ON public.king_team_matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = king_team_matches.room_id AND rp.user_id = auth.uid()
  ));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.king_team_matches;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.king_team_matches;
END $$;

ALTER TABLE public.king_team_matches REPLICA IDENTITY FULL;

-- ── internal helpers (granted to nobody) ───────────────────────────────────

-- Caller must be a seated human of the room. Returns their participant row.
CREATE OR REPLACE FUNCTION public.king_team_member(p_room_id uuid, p_user uuid)
RETURNS public.room_participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.room_participants%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = p_user
     AND status IN ('joined', 'ready', 'playing')
     AND NOT COALESCE(is_bot, false);
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Not a player in this room';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_member(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- The state a client may see, fresh from the match row.
CREATE OR REPLACE FUNCTION public.king_team_state(p_match public.king_team_matches)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question public.king_questions%ROWTYPE;
  v_state jsonb;
BEGIN
  v_state := jsonb_build_object(
    'match_id', p_match.id,
    'room_id', p_match.room_id,
    'status', p_match.status,
    'captain', p_match.captain,
    'team_score', p_match.team_score,
    'king_score', p_match.king_score,
    'suggestions', p_match.suggestions,
    'last_result', p_match.last_result,
    'question_number', COALESCE(array_length(p_match.question_ids, 1), 0)
                         + CASE WHEN p_match.current_question_id IS NULL THEN 0 ELSE 1 END);

  IF p_match.current_question_id IS NOT NULL THEN
    SELECT * INTO v_question FROM public.king_questions WHERE id = p_match.current_question_id;
    v_state := v_state || jsonb_build_object(
      'question', jsonb_build_object(
        'question_text', v_question.question_text,
        'image_url', v_question.image_url,
        'icon_slug', v_question.icon_slug,
        'think_deadline', p_match.drawn_at + interval '60 seconds'));
    IF p_match.options_at IS NOT NULL THEN
      v_state := v_state || jsonb_build_object(
        'options', p_match.options,
        'commit_deadline', p_match.options_at + interval '20 seconds');
    END IF;
  END IF;

  RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_state(public.king_team_matches) FROM PUBLIC, anon, authenticated;

-- Draw the next question into the match row. Prefers questions no current
-- member of the couch has faced in their solo duels, so nobody sits on the
-- answer; falls back to the whole pool before dead-ending.
CREATE OR REPLACE FUNCTION public.king_team_draw_into(p_match public.king_team_matches)
RETURNS public.king_team_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question public.king_questions%ROWTYPE;
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  SELECT * INTO v_question FROM public.king_questions q
   WHERE q.is_active AND q.language = p_match.language
     AND q.id <> ALL (p_match.question_ids)
     AND NOT EXISTS (
       SELECT 1 FROM public.king_matches km
        JOIN public.room_participants rp
          ON rp.user_id = km.user_id AND rp.room_id = p_match.room_id
       WHERE q.id = ANY (km.question_ids))
   ORDER BY random() LIMIT 1;

  IF v_question.id IS NULL THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = p_match.language
       AND q.id <> ALL (p_match.question_ids)
     ORDER BY random() LIMIT 1;
  END IF;

  IF v_question.id IS NULL THEN
    RAISE EXCEPTION 'KING_NO_QUESTIONS';
  END IF;

  UPDATE public.king_team_matches
     SET current_question_id = v_question.id,
         drawn_at = now(),
         options = NULL,
         options_at = NULL,
         suggestions = '{}'::jsonb,
         last_result = NULL,
         updated_at = now()
   WHERE id = p_match.id
  RETURNING * INTO v_match;
  RETURN v_match;
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_draw_into(public.king_team_matches) FROM PUBLIC, anon, authenticated;

-- Open the commit window: build the shuffled options now (never earlier, so
-- the row never leaks them mid-think).
CREATE OR REPLACE FUNCTION public.king_team_open_options(p_match public.king_team_matches)
RETURNS public.king_team_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question public.king_questions%ROWTYPE;
  v_options jsonb;
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  IF p_match.options_at IS NOT NULL THEN
    RETURN p_match;
  END IF;
  SELECT * INTO v_question FROM public.king_questions WHERE id = p_match.current_question_id;
  SELECT jsonb_agg(value ORDER BY random()) INTO v_options
    FROM jsonb_array_elements(
      v_question.incorrect_answers || to_jsonb(ARRAY[v_question.correct_answer]));
  UPDATE public.king_team_matches
     SET options = v_options, options_at = now(), updated_at = now()
   WHERE id = p_match.id
  RETURNING * INTO v_match;
  RETURN v_match;
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_open_options(public.king_team_matches) FROM PUBLIC, anon, authenticated;

-- Resolve the live question with the team's answer (NULL = nothing locked,
-- which is a miss), credit the couch, and end the match at 6.
CREATE OR REPLACE FUNCTION public.king_team_resolve(p_match public.king_team_matches, p_answer text)
RETURNS public.king_team_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crack_coins constant integer := 10;
  v_win_coins   constant integer := 200;
  v_question public.king_questions%ROWTYPE;
  v_correct boolean;
  v_match public.king_team_matches%ROWTYPE;
  v_qno integer := COALESCE(array_length(p_match.question_ids, 1), 0) + 1;
  v_member record;
BEGIN
  SELECT * INTO v_question FROM public.king_questions WHERE id = p_match.current_question_id;
  v_correct := p_answer IS NOT NULL AND p_answer = v_question.correct_answer;

  UPDATE public.king_team_matches
     SET team_score = team_score + CASE WHEN v_correct THEN 1 ELSE 0 END,
         king_score = king_score + CASE WHEN v_correct THEN 0 ELSE 1 END,
         question_ids = question_ids || v_question.id,
         current_question_id = NULL,
         drawn_at = NULL,
         options = NULL,
         options_at = NULL,
         suggestions = '{}'::jsonb,
         last_result = jsonb_build_object(
           'question_text', v_question.question_text,
           'chosen', p_answer,
           'correct', v_correct,
           'correct_answer', v_question.correct_answer,
           'explanation', v_question.explanation),
         updated_at = now()
   WHERE id = p_match.id
  RETURNING * INTO v_match;

  IF v_match.team_score >= 6 THEN
    UPDATE public.king_team_matches SET status = 'won', finished_at = now(), updated_at = now()
     WHERE id = v_match.id RETURNING * INTO v_match;
  ELSIF v_match.king_score >= 6 THEN
    UPDATE public.king_team_matches SET status = 'lost', finished_at = now(), updated_at = now()
     WHERE id = v_match.id RETURNING * INTO v_match;
  END IF;

  -- Every human on the couch is paid alike; the ledger's unique reference
  -- makes re-resolution attempts free.
  FOR v_member IN
    SELECT user_id FROM public.room_participants
     WHERE room_id = v_match.room_id
       AND status IN ('joined', 'ready', 'playing')
       AND NOT COALESCE(is_bot, false)
  LOOP
    BEGIN
      IF v_correct THEN
        PERFORM public.apply_currency_grant(
          v_member.user_id, 'king_question', v_crack_coins, 0,
          'team:' || v_match.id::text || ':' || v_qno::text);
      END IF;
      IF v_match.status = 'won' THEN
        PERFORM public.apply_currency_grant(
          v_member.user_id, 'king_win', v_win_coins, 0, 'team:' || v_match.id::text);
      END IF;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN v_match;
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_resolve(public.king_team_matches, text) FROM PUBLIC, anon, authenticated;

-- ── the player-facing RPCs ─────────────────────────────────────────────────

-- Host starts (or returns the already-running) team duel and the first
-- question is drawn immediately.
CREATE OR REPLACE FUNCTION public.king_team_start(p_room_id uuid, p_language text DEFAULT 'en')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_room public.game_rooms%ROWTYPE;
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type_key IS DISTINCT FROM 'king' THEN
    RAISE EXCEPTION 'Not a King lounge';
  END IF;
  IF v_room.host_user_id <> v_user THEN
    RAISE EXCEPTION 'Only the host starts the duel';
  END IF;
  PERFORM public.king_team_member(p_room_id, v_user);

  SELECT * INTO v_match FROM public.king_team_matches
   WHERE room_id = p_room_id AND status = 'playing';
  IF v_match.id IS NULL THEN
    INSERT INTO public.king_team_matches (room_id, language, captain)
    VALUES (p_room_id, COALESCE(NULLIF(btrim(p_language), ''), 'en'), v_user)
    RETURNING * INTO v_match;
  END IF;
  IF v_match.current_question_id IS NULL AND v_match.status = 'playing' THEN
    v_match := public.king_team_draw_into(v_match);
  END IF;
  RETURN public.king_team_state(v_match);
END;
$$;

-- Any member reads the room's current (or latest finished) team duel.
CREATE OR REPLACE FUNCTION public.king_team_view(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM public.king_team_member(p_room_id, v_user);
  SELECT * INTO v_match FROM public.king_team_matches
   WHERE room_id = p_room_id
   ORDER BY (status = 'playing') DESC, started_at DESC
   LIMIT 1;
  IF v_match.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public.king_team_state(v_match);
END;
$$;

-- After a reveal, whoever taps first pulls the next question — the RPC is
-- effectively idempotent, so a race draws exactly once.
CREATE OR REPLACE FUNCTION public.king_team_next(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM public.king_team_member(p_room_id, v_user);
  SELECT * INTO v_match FROM public.king_team_matches
   WHERE room_id = p_room_id AND status = 'playing' FOR UPDATE;
  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'No live team duel';
  END IF;
  IF v_match.current_question_id IS NULL THEN
    v_match := public.king_team_draw_into(v_match);
  END IF;
  RETURN public.king_team_state(v_match);
END;
$$;

-- The captain opens the options when the team is ready to answer.
CREATE OR REPLACE FUNCTION public.king_team_options(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_match FROM public.king_team_matches
   WHERE room_id = p_room_id AND status = 'playing' FOR UPDATE;
  IF v_match.id IS NULL OR v_match.current_question_id IS NULL THEN
    RAISE EXCEPTION 'No live question';
  END IF;
  IF v_match.captain <> v_user THEN
    RAISE EXCEPTION 'Only the captain opens the options';
  END IF;
  v_match := public.king_team_open_options(v_match);
  RETURN public.king_team_state(v_match);
END;
$$;

-- A teammate taps the answer they believe in; re-tapping changes it while
-- the window is open. The captain sees where the votes cluster.
CREATE OR REPLACE FUNCTION public.king_team_suggest(p_room_id uuid, p_answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM public.king_team_member(p_room_id, v_user);
  SELECT * INTO v_match FROM public.king_team_matches
   WHERE room_id = p_room_id AND status = 'playing' FOR UPDATE;
  IF v_match.id IS NULL OR v_match.options_at IS NULL THEN
    RAISE EXCEPTION 'The options are not open';
  END IF;
  IF NOT (v_match.options @> to_jsonb(ARRAY[p_answer])) THEN
    RAISE EXCEPTION 'Not one of the options';
  END IF;
  UPDATE public.king_team_matches
     SET suggestions = suggestions || jsonb_build_object(v_user::text, p_answer),
         updated_at = now()
   WHERE id = v_match.id
  RETURNING * INTO v_match;
  RETURN public.king_team_state(v_match);
END;
$$;

-- The captain locks the team's answer.
CREATE OR REPLACE FUNCTION public.king_team_commit(p_room_id uuid, p_answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_team_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_match FROM public.king_team_matches
   WHERE room_id = p_room_id AND status = 'playing' FOR UPDATE;
  IF v_match.id IS NULL OR v_match.options_at IS NULL THEN
    RAISE EXCEPTION 'The options are not open';
  END IF;
  IF v_match.captain <> v_user THEN
    RAISE EXCEPTION 'Only the captain locks the answer';
  END IF;
  IF NOT (v_match.options @> to_jsonb(ARRAY[p_answer])) THEN
    RAISE EXCEPTION 'Not one of the options';
  END IF;
  v_match := public.king_team_resolve(v_match, p_answer);
  RETURN public.king_team_state(v_match);
END;
$$;

-- The deadline pump, callable by any member: opens the options when the
-- think minute dies, and at the commit deadline locks the majority
-- suggestion (captain's pick breaks ties, then the first leader
-- alphabetically); no suggestions at all is a miss.
CREATE OR REPLACE FUNCTION public.king_team_advance(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_team_matches%ROWTYPE;
  v_answer text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM public.king_team_member(p_room_id, v_user);
  SELECT * INTO v_match FROM public.king_team_matches
   WHERE room_id = p_room_id AND status = 'playing' FOR UPDATE;
  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'No live team duel';
  END IF;

  IF v_match.current_question_id IS NOT NULL
     AND v_match.options_at IS NULL
     AND now() > v_match.drawn_at + interval '60 seconds' THEN
    v_match := public.king_team_open_options(v_match);

  ELSIF v_match.options_at IS NOT NULL
        AND now() > v_match.options_at + interval '20 seconds' THEN
    SELECT tally.value INTO v_answer
      FROM (
        SELECT s.value, count(*) AS votes
          FROM jsonb_each_text(v_match.suggestions) s
         GROUP BY s.value
      ) tally
     ORDER BY tally.votes DESC,
              (tally.value = (v_match.suggestions ->> v_match.captain::text)) DESC,
              tally.value ASC
     LIMIT 1;
    v_match := public.king_team_resolve(v_match, v_answer);
  END IF;

  RETURN public.king_team_state(v_match);
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_start(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.king_team_view(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.king_team_next(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.king_team_options(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.king_team_suggest(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.king_team_commit(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.king_team_advance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_team_start(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.king_team_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.king_team_next(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.king_team_options(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.king_team_suggest(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.king_team_commit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.king_team_advance(uuid) TO authenticated;
