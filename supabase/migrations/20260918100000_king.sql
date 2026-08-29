-- MyTrivia King: the What? Where? When?-style solo mode
-- (docs/GAME_TYPES_DESIGN.md §3). Very hard questions answerable by pure
-- logic; one minute of real thinking with NO options on screen, then a short
-- commit window with four options; crack it and you score, miss and the King
-- scores; first to 6 ends the match.
--
-- The mode's integrity is enforced by what the client simply cannot read:
--
--   * king_questions has RLS enabled and NO policies — it is invisible to
--     every client role. The question text arrives from king_draw_question,
--     the options only from king_show_options (which stamps the moment the
--     commit clock started), the correct answer and the explanation only
--     from the submit/expire result. There is nothing to peek at during the
--     think phase, not even in the network tab.
--   * both deadlines are server timestamps on the match row: 60s of thinking
--     from drawn_at (early commit allowed), then 10s from options_at (+2s of
--     wire grace). A submit outside them is refused; an expiry claim is
--     verified against the clock, not taken on the client's word.
--   * payouts are constants here, credited through the ledger with a unique
--     index making each one once-only.
--
-- The pool ships per-language rows like `questions` does (translated_from
-- links a translation to its source), and nothing is drawable until a human
-- flips is_active — see the seed migration alongside this one.

CREATE TABLE IF NOT EXISTS public.king_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language        text NOT NULL DEFAULT 'en',
  translated_from uuid REFERENCES public.king_questions(id),
  question_text   text NOT NULL,
  image_url       text,
  correct_answer  text NOT NULL,
  incorrect_answers jsonb NOT NULL,
  explanation     text NOT NULL,
  difficulty      integer NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  source          text NOT NULL DEFAULT 'curated',
  is_active       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.king_questions ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: clients never read this table.

CREATE TABLE IF NOT EXISTS public.king_matches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  language      text NOT NULL DEFAULT 'en',
  status        text NOT NULL DEFAULT 'playing'
                  CHECK (status IN ('playing', 'won', 'lost', 'abandoned')),
  player_score  integer NOT NULL DEFAULT 0,
  king_score    integer NOT NULL DEFAULT 0,
  question_ids  uuid[] NOT NULL DEFAULT '{}',
  -- The live question, while one is on screen.
  current_question_id uuid REFERENCES public.king_questions(id),
  drawn_at      timestamptz,
  options_at    timestamptz,
  options       jsonb,      -- shuffled once at draw, revealed by king_show_options
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

ALTER TABLE public.king_matches ENABLE ROW LEVEL SECURITY;
-- No policies here either — not even owner SELECT. The match row carries the
-- shuffled options during the think phase, so a readable row would hand a
-- player the options before the commit clock starts, through the table
-- instead of the RPC. Every piece of state a client may see comes back from
-- the RPCs via king_state().

CREATE INDEX IF NOT EXISTS king_matches_user_idx
  ON public.king_matches (user_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS king_questions_draw_idx
  ON public.king_questions (language, is_active);

-- ── payout ceilings and ledger idempotency ─────────────────────────────────

INSERT INTO public.currency_grant_limits
  (kind,            max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('king_win',                 200,             0,          1000,            0),
  ('king_question',             10,             0,           120,            0)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;

CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_king_reference_unique
  ON public.currency_grants (user_id, kind, reference)
  WHERE kind IN ('king_win', 'king_question') AND reference IS NOT NULL;

-- ── internal helpers (not granted to anyone) ───────────────────────────────

-- The state a client is allowed to see, built fresh from the match row.
-- Never includes the correct answer or the explanation; includes the
-- question text only once drawn and the options only once shown.
CREATE OR REPLACE FUNCTION public.king_state(p_match public.king_matches)
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
    'status', p_match.status,
    'player_score', p_match.player_score,
    'king_score', p_match.king_score,
    'question_number', COALESCE(array_length(p_match.question_ids, 1), 0)
                         + CASE WHEN p_match.current_question_id IS NULL THEN 0 ELSE 1 END);

  IF p_match.current_question_id IS NOT NULL THEN
    SELECT * INTO v_question FROM public.king_questions WHERE id = p_match.current_question_id;
    v_state := v_state || jsonb_build_object(
      'question', jsonb_build_object(
        'question_text', v_question.question_text,
        'image_url', v_question.image_url,
        'think_deadline', p_match.drawn_at + interval '60 seconds'));
    IF p_match.options_at IS NOT NULL THEN
      v_state := v_state || jsonb_build_object(
        'options', p_match.options,
        'commit_deadline', p_match.options_at + interval '10 seconds');
    END IF;
  END IF;

  RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.king_state(public.king_matches) FROM PUBLIC, anon, authenticated;

-- Closes the live question with an outcome, credits what the outcome is
-- worth, and ends the match at 6. Shared by submit and expire.
CREATE OR REPLACE FUNCTION public.king_finish_question(
  p_match public.king_matches,
  p_correct boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crack_coins constant integer := 10;
  v_win_coins   constant integer := 200;
  v_question public.king_questions%ROWTYPE;
  v_match public.king_matches%ROWTYPE;
  v_qno integer := COALESCE(array_length(p_match.question_ids, 1), 0) + 1;
BEGIN
  SELECT * INTO v_question FROM public.king_questions WHERE id = p_match.current_question_id;

  UPDATE public.king_matches
     SET question_ids = question_ids || p_match.current_question_id,
         current_question_id = NULL,
         drawn_at = NULL,
         options_at = NULL,
         options = NULL,
         player_score = player_score + CASE WHEN p_correct THEN 1 ELSE 0 END,
         king_score = king_score + CASE WHEN p_correct THEN 0 ELSE 1 END
   WHERE id = p_match.id
  RETURNING * INTO v_match;

  IF v_match.player_score >= 6 THEN
    UPDATE public.king_matches SET status = 'won', finished_at = now()
     WHERE id = v_match.id RETURNING * INTO v_match;
  ELSIF v_match.king_score >= 6 THEN
    UPDATE public.king_matches SET status = 'lost', finished_at = now()
     WHERE id = v_match.id RETURNING * INTO v_match;
  END IF;

  BEGIN
    IF p_correct THEN
      PERFORM public.apply_currency_grant(
        v_match.user_id, 'king_question', v_crack_coins, 0,
        v_match.id::text || ':' || v_qno::text);
    END IF;
    IF v_match.status = 'won' THEN
      PERFORM public.apply_currency_grant(
        v_match.user_id, 'king_win', v_win_coins, 0, v_match.id::text);
    END IF;
  EXCEPTION WHEN unique_violation THEN
    NULL; -- already credited for this question or this match; never twice
  END;

  RETURN public.king_state(v_match) || jsonb_build_object(
    'correct', p_correct,
    'correct_answer', v_question.correct_answer,
    'explanation', v_question.explanation);
END;
$$;

REVOKE ALL ON FUNCTION public.king_finish_question(public.king_matches, boolean) FROM PUBLIC, anon, authenticated;

-- ── the player-facing RPCs ─────────────────────────────────────────────────

-- Starts a match, or resumes the caller's recent unfinished one (a killed
-- app must not forfeit a 5-5 thriller). An unfinished match older than an
-- hour is abandoned and a fresh one begins.
CREATE OR REPLACE FUNCTION public.king_start_match(p_language text DEFAULT 'en')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- The dark launch holds against hand-crafted calls, exactly as it does in
  -- mm_enqueue: a mode hidden from the chooser deals no questions and pays
  -- no coins until the registry flips it live.
  IF NOT EXISTS (SELECT 1 FROM public.game_types WHERE key = 'king' AND is_live) THEN
    RAISE EXCEPTION 'This game type is not live yet';
  END IF;

  SELECT * INTO v_match FROM public.king_matches
   WHERE user_id = v_user AND status = 'playing'
   ORDER BY started_at DESC LIMIT 1
   FOR UPDATE;

  IF v_match.id IS NOT NULL THEN
    IF v_match.started_at > now() - interval '1 hour' THEN
      -- Resume. A live question whose commit window already died is closed
      -- against the player first, so backgrounding the app mid-question is
      -- not a free retry.
      IF v_match.current_question_id IS NOT NULL
         AND ((v_match.options_at IS NOT NULL AND now() > v_match.options_at + interval '12 seconds')
           OR (v_match.options_at IS NULL AND now() > v_match.drawn_at + interval '75 seconds')) THEN
        RETURN public.king_finish_question(v_match, false) - 'correct' - 'correct_answer' - 'explanation';
      END IF;
      RETURN public.king_state(v_match);
    END IF;
    UPDATE public.king_matches SET status = 'abandoned', finished_at = now()
     WHERE id = v_match.id;
  END IF;

  INSERT INTO public.king_matches (user_id, language)
  VALUES (v_user, COALESCE(NULLIF(btrim(p_language), ''), 'en'))
  RETURNING * INTO v_match;

  RETURN public.king_state(v_match);
END;
$$;

REVOKE ALL ON FUNCTION public.king_start_match(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_start_match(text) TO authenticated;

-- Draws the next envelope: question text only, no options. The options are
-- shuffled and stored now so king_show_options is idempotent, but they stay
-- server-side until the commit phase opens.
CREATE OR REPLACE FUNCTION public.king_draw_question(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_matches%ROWTYPE;
  v_question public.king_questions%ROWTYPE;
  v_options jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_match FROM public.king_matches
   WHERE id = p_match_id AND user_id = v_user FOR UPDATE;
  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status <> 'playing' THEN
    RAISE EXCEPTION 'Match is over';
  END IF;
  IF v_match.current_question_id IS NOT NULL THEN
    -- A remount mid-question resumes it rather than drawing a fresh one.
    RETURN public.king_state(v_match);
  END IF;

  -- Prefer questions this player has never faced in any match; when the
  -- pool is exhausted, allow repeats from other matches rather than dead-end
  -- (this match's own questions stay excluded either way).
  SELECT * INTO v_question FROM public.king_questions q
   WHERE q.is_active AND q.language = v_match.language
     AND q.id <> ALL (v_match.question_ids)
     AND NOT EXISTS (
       SELECT 1 FROM public.king_matches m
        WHERE m.user_id = v_user AND m.id <> v_match.id
          AND q.id = ANY (m.question_ids))
   ORDER BY random() LIMIT 1;

  IF v_question.id IS NULL THEN
    SELECT * INTO v_question FROM public.king_questions q
     WHERE q.is_active AND q.language = v_match.language
       AND q.id <> ALL (v_match.question_ids)
     ORDER BY random() LIMIT 1;
  END IF;

  IF v_question.id IS NULL THEN
    RAISE EXCEPTION 'KING_NO_QUESTIONS';
  END IF;

  SELECT jsonb_agg(value ORDER BY random()) INTO v_options
    FROM jsonb_array_elements(
      v_question.incorrect_answers || to_jsonb(ARRAY[v_question.correct_answer]));

  UPDATE public.king_matches
     SET current_question_id = v_question.id,
         drawn_at = now(),
         options_at = NULL,
         options = v_options
   WHERE id = v_match.id
  RETURNING * INTO v_match;

  RETURN public.king_state(v_match);
END;
$$;

REVOKE ALL ON FUNCTION public.king_draw_question(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_draw_question(uuid) TO authenticated;

-- Opens the commit phase: the four options appear and the 10-second clock
-- starts. Idempotent — a remount gets the same options and the original
-- deadline, never a fresh clock.
CREATE OR REPLACE FUNCTION public.king_show_options(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_match FROM public.king_matches
   WHERE id = p_match_id AND user_id = v_user FOR UPDATE;
  IF v_match.id IS NULL OR v_match.current_question_id IS NULL THEN
    RAISE EXCEPTION 'No live question';
  END IF;

  -- The think phase is a server deadline too: 60 seconds from the draw plus
  -- the same grace the never-shown path gets. A client that sat on the
  -- question longer (researching it with the clock stopped) does not get a
  -- commit window at all — the question closes against the player.
  IF v_match.options_at IS NULL
     AND now() > v_match.drawn_at + interval '75 seconds' THEN
    RETURN public.king_finish_question(v_match, false);
  END IF;

  IF v_match.options_at IS NULL THEN
    UPDATE public.king_matches SET options_at = now()
     WHERE id = v_match.id RETURNING * INTO v_match;
  END IF;

  RETURN public.king_state(v_match);
END;
$$;

REVOKE ALL ON FUNCTION public.king_show_options(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_show_options(uuid) TO authenticated;

-- The commit. Correctness is decided here; the reveal (correct answer +
-- the logic chain) rides back on the result — the soul of the mode is that
-- even a miss teaches the derivation.
CREATE OR REPLACE FUNCTION public.king_submit_answer(p_match_id uuid, p_answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_matches%ROWTYPE;
  v_correct boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_match FROM public.king_matches
   WHERE id = p_match_id AND user_id = v_user FOR UPDATE;
  IF v_match.id IS NULL OR v_match.current_question_id IS NULL THEN
    RAISE EXCEPTION 'No live question';
  END IF;
  IF v_match.options_at IS NULL THEN
    RAISE EXCEPTION 'Options are not on screen yet';
  END IF;
  -- 10 seconds to commit, 2 more for the wire.
  IF now() > v_match.options_at + interval '12 seconds' THEN
    RAISE EXCEPTION 'Too late — the commit window is over';
  END IF;

  SELECT btrim(COALESCE(p_answer, '')) = btrim(q.correct_answer) INTO v_correct
    FROM public.king_questions q WHERE q.id = v_match.current_question_id;

  RETURN public.king_finish_question(v_match, v_correct);
END;
$$;

REVOKE ALL ON FUNCTION public.king_submit_answer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_submit_answer(uuid, text) TO authenticated;

-- The clock ran out with no commit: the King takes the point. The claim is
-- checked against the server clock — a client cannot expire a question
-- early to dodge one it dislikes, and the think phase cannot be expired at
-- all until its full window (plus the never-shown-options grace) is gone.
CREATE OR REPLACE FUNCTION public.king_expire_question(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_match FROM public.king_matches
   WHERE id = p_match_id AND user_id = v_user FOR UPDATE;
  IF v_match.id IS NULL OR v_match.current_question_id IS NULL THEN
    RAISE EXCEPTION 'No live question';
  END IF;

  IF NOT ((v_match.options_at IS NOT NULL AND now() > v_match.options_at + interval '12 seconds')
       OR (v_match.options_at IS NULL AND now() > v_match.drawn_at + interval '75 seconds')) THEN
    RAISE EXCEPTION 'The question is still live';
  END IF;

  RETURN public.king_finish_question(v_match, false);
END;
$$;

REVOKE ALL ON FUNCTION public.king_expire_question(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_expire_question(uuid) TO authenticated;

-- Walking away mid-match. No payout, no refund, the scoreboard stands.
CREATE OR REPLACE FUNCTION public.king_abandon_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.king_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.king_matches
     SET status = 'abandoned', finished_at = now(),
         current_question_id = NULL, drawn_at = NULL, options_at = NULL, options = NULL
   WHERE id = p_match_id AND user_id = v_user AND status = 'playing'
  RETURNING * INTO v_match;

  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'No running match to abandon';
  END IF;

  RETURN public.king_state(v_match);
END;
$$;

REVOKE ALL ON FUNCTION public.king_abandon_match(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_abandon_match(uuid) TO authenticated;
