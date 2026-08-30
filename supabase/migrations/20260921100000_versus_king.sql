-- Versus King: the King game type rebuilt as a co-op team match
-- (docs/GAME_TYPES_DESIGN.md §3). One room of 2..10 friends versus the King.
--
-- The shape, per product spec: before the game a 30-second vote elects a
-- captain. Six rounds, each a random category with five questions. On every
-- question the players vote by tapping the answer they believe in; the
-- captain sees who picked what and locks the team's final answer, which is
-- the only answer that counts. Three or more correct finals take the round
-- for the team; otherwise the King takes it. Six rounds can end 3:3 — then
-- the captain alone plays a blitz question: correct wins the match, wrong
-- (or silence) hands it to the King. Winners are paid coins.
--
-- Same authority split as Team Battle (20260917100000):
--   * all timers are server deadlines; clients render countdowns and call
--     kt_advance when one expires — first caller wins, the rest no-op;
--   * captain election, final-answer correctness, round outcomes and payouts
--     are computed in the RPCs; clients write nothing to these tables;
--   * the host's device picks the random categories and fetches question
--     material through questionService, handing it to kt_start_match — the
--     same trust level as room_questions and team_battle_board, noted there.
--
-- The solo King RPCs (king_* of 20260918100000) stay in place but nothing
-- calls them any more; the King card launches this flow.

-- ── 1. The board: one row per round, plus the blitz ────────────────────────

CREATE TABLE IF NOT EXISTS public.king_team_board (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  game_id       uuid NOT NULL REFERENCES public.room_games(id) ON DELETE CASCADE,
  -- 0..5 are the six rounds; 6 is the blitz reserve.
  round_index   integer NOT NULL CHECK (round_index BETWEEN 0 AND 6),
  category_id   text,
  category_name text NOT NULL,
  -- [{question_text, correct_answer, shuffled_answers, image_url?}, ...]
  questions     jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, round_index)
);

-- ── 2. The match state machine ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.king_team_state (
  room_id         uuid PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  game_id         uuid NOT NULL REFERENCES public.room_games(id) ON DELETE CASCADE,
  phase           text NOT NULL CHECK (phase IN
                    ('captain_vote', 'question', 'reveal', 'round_result', 'blitz', 'done')),
  round_index     integer NOT NULL DEFAULT 0,
  question_index  integer NOT NULL DEFAULT 0,
  deadline        timestamptz,
  captain_user_id uuid,
  -- {voter_user_id: candidate_user_id}, cleared once resolved
  captain_votes   jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- The current question's advisory votes: {user_id: option}
  picks           jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_answer    text,
  -- What the last reveal showed: {final, correct_answer, was_correct, picks,
  --  by_captain} — kept so a device that missed the transition can render it.
  last_reveal     jsonb,
  round_correct   integer NOT NULL DEFAULT 0,
  team_rounds     integer NOT NULL DEFAULT 0,
  king_rounds     integer NOT NULL DEFAULT 0,
  winner          text CHECK (winner IN ('team', 'king')),
  settled         boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.king_team_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.king_team_state ENABLE ROW LEVEL SECURITY;

-- Readable by the room's players; written only by the RPCs below. The board
-- row carries correct answers, readable by any participant — the exact trust
-- level of room_questions and team_battle_board today. The captain-only view
-- of who-picked-what is a UI rule, not a security boundary.
DROP POLICY IF EXISTS "Participants can view their king board" ON public.king_team_board;
CREATE POLICY "Participants can view their king board"
  ON public.king_team_board FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = king_team_board.room_id AND rp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Participants can view their king state" ON public.king_team_state;
CREATE POLICY "Participants can view their king state"
  ON public.king_team_state FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = king_team_state.room_id AND rp.user_id = auth.uid()
  ));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.king_team_state;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.king_team_state;
END $$;

ALTER TABLE public.king_team_state REPLICA IDENTITY FULL;

-- ── 3. Payout ceilings and ledger idempotency ──────────────────────────────
--
-- king_win (200/call, 1000/day) already exists from the solo migration and
-- keeps its meaning: a won match pays it. king_play is the show-up reward,
-- sized like team_battle_play.

INSERT INTO public.currency_grant_limits
  (kind,        max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('king_play',             50,             0,           500,            0)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;

CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_king_play_reference_unique
  ON public.currency_grants (user_id, kind, reference)
  WHERE kind = 'king_play' AND reference IS NOT NULL;

-- ── 4. Internal helpers (not granted to anyone) ────────────────────────────

-- Resolve the current question against the board: mark the reveal, score the
-- players whose advisory pick was right (their personal correct-count lives
-- in room_participants.score for the history/MVP), bump round_correct when
-- the FINAL answer was right, and open the 4-second reveal window.
CREATE OR REPLACE FUNCTION public.kt_resolve_question(
  p_room_id uuid,
  p_final text,
  p_by_captain boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.king_team_state%ROWTYPE;
  v_correct text;
  v_was_correct boolean;
BEGIN
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = p_room_id FOR UPDATE;

  SELECT q ->> 'correct_answer' INTO v_correct
    FROM public.king_team_board b,
         LATERAL jsonb_array_elements(b.questions) WITH ORDINALITY AS t(q, ord)
   WHERE b.game_id = v_state.game_id
     AND b.round_index = v_state.round_index
     AND t.ord = v_state.question_index + 1;

  v_was_correct := p_final IS NOT NULL AND p_final = v_correct;

  -- Personal tallies for the scoreboard: an advisory pick that matched.
  UPDATE public.room_participants rp
     SET score = COALESCE(rp.score, 0) + 1
   WHERE rp.room_id = p_room_id
     AND rp.status = 'playing'
     AND v_state.picks ->> rp.user_id::text = v_correct;

  UPDATE public.king_team_state
     SET phase = 'reveal',
         deadline = now() + interval '4 seconds',
         final_answer = p_final,
         round_correct = round_correct + CASE WHEN v_was_correct THEN 1 ELSE 0 END,
         last_reveal = jsonb_build_object(
           'final', p_final,
           'correct_answer', v_correct,
           'was_correct', v_was_correct,
           'picks', v_state.picks,
           'by_captain', p_by_captain,
           'round_index', v_state.round_index,
           'question_index', v_state.question_index),
         updated_at = now()
   WHERE room_id = p_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.kt_resolve_question(uuid, text, boolean) FROM PUBLIC, anon, authenticated;

-- ── 5. The player-facing RPCs ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kt_start_match(p_room_id uuid, p_board jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_room public.game_rooms%ROWTYPE;
  v_players integer;
  v_game_id uuid;
  v_rounds jsonb;
  v_round jsonb;
  v_blitz jsonb;
  v_i integer := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  IF v_room.host_user_id <> v_caller THEN
    RAISE EXCEPTION 'Only the host can start the match';
  END IF;
  IF v_room.game_type_key IS DISTINCT FROM 'king' THEN
    RAISE EXCEPTION 'Not a Versus King room';
  END IF;
  -- The dark launch holds against hand-crafted calls, as in tb_start_match.
  IF NOT EXISTS (SELECT 1 FROM public.game_types WHERE key = 'king' AND is_live) THEN
    RAISE EXCEPTION 'This game type is not live yet';
  END IF;
  IF v_room.status = 'playing' THEN
    RAISE EXCEPTION 'Match already running';
  END IF;

  SELECT count(*) INTO v_players
    FROM public.room_participants
   WHERE room_id = p_room_id AND status IN ('joined', 'ready', 'playing');
  IF v_players < 2 THEN
    RAISE EXCEPTION 'Versus King needs at least 2 players';
  END IF;
  IF v_players > 10 THEN
    RAISE EXCEPTION 'Versus King is capped at 10 players';
  END IF;

  v_rounds := p_board -> 'rounds';
  IF v_rounds IS NULL OR jsonb_typeof(v_rounds) <> 'array'
     OR jsonb_array_length(v_rounds) <> 6 THEN
    RAISE EXCEPTION 'Board must carry exactly 6 rounds';
  END IF;
  v_blitz := COALESCE(p_board -> 'blitz', '{}'::jsonb);
  IF jsonb_array_length(COALESCE(v_blitz -> 'questions', '[]'::jsonb)) < 1 THEN
    RAISE EXCEPTION 'Board must carry a blitz question';
  END IF;

  INSERT INTO public.room_games (room_id, game_number)
  VALUES (
    p_room_id,
    COALESCE((SELECT max(game_number) FROM public.room_games WHERE room_id = p_room_id), 0) + 1
  )
  RETURNING id INTO v_game_id;

  FOR v_round IN SELECT * FROM jsonb_array_elements(v_rounds) LOOP
    IF COALESCE(v_round ->> 'category_name', '') = '' THEN
      RAISE EXCEPTION 'Round % has no category name', v_i;
    END IF;
    IF jsonb_array_length(COALESCE(v_round -> 'questions', '[]'::jsonb)) <> 5 THEN
      RAISE EXCEPTION 'Round % needs exactly 5 questions', v_i;
    END IF;
    INSERT INTO public.king_team_board
      (room_id, game_id, round_index, category_id, category_name, questions)
    VALUES
      (p_room_id, v_game_id, v_i, v_round ->> 'category_id',
       v_round ->> 'category_name', v_round -> 'questions');
    v_i := v_i + 1;
  END LOOP;

  INSERT INTO public.king_team_board
    (room_id, game_id, round_index, category_id, category_name, questions)
  VALUES
    (p_room_id, v_game_id, 6, v_blitz ->> 'category_id',
     COALESCE(v_blitz ->> 'category_name', 'Blitz'), v_blitz -> 'questions');

  UPDATE public.room_participants
     SET score = 0,
         status = 'playing'::public.participant_status
   WHERE room_id = p_room_id AND status IN ('joined', 'ready', 'playing');

  INSERT INTO public.king_team_state
    (room_id, game_id, phase, deadline)
  VALUES
    (p_room_id, v_game_id, 'captain_vote', now() + interval '30 seconds')
  ON CONFLICT (room_id) DO UPDATE
    SET game_id = EXCLUDED.game_id,
        phase = 'captain_vote',
        round_index = 0,
        question_index = 0,
        deadline = EXCLUDED.deadline,
        captain_user_id = NULL,
        captain_votes = '{}'::jsonb,
        picks = '{}'::jsonb,
        final_answer = NULL,
        last_reveal = NULL,
        round_correct = 0,
        team_rounds = 0,
        king_rounds = 0,
        winner = NULL,
        settled = false,
        updated_at = now();

  UPDATE public.game_rooms
     SET status = 'playing'::public.room_status,
         current_game_id = v_game_id,
         started_at = now(),
         last_activity_at = now()
   WHERE id = p_room_id;

  RETURN v_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.kt_start_match(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kt_start_match(uuid, jsonb) TO authenticated;

-- One captain vote per player, changeable until the vote resolves. When the
-- whole roster has voted the election resolves immediately rather than
-- sitting out the clock.
CREATE OR REPLACE FUNCTION public.kt_vote_captain(p_room_id uuid, p_candidate uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.king_team_state%ROWTYPE;
  v_players integer;
  v_votes jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'captain_vote' THEN
    RAISE EXCEPTION 'No captain vote is open';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = v_caller AND status = 'playing'
  ) THEN
    RAISE EXCEPTION 'Not a player of this match';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = p_candidate AND status = 'playing'
  ) THEN
    RAISE EXCEPTION 'Candidate is not a player of this match';
  END IF;

  v_votes := v_state.captain_votes || jsonb_build_object(v_caller::text, p_candidate::text);
  UPDATE public.king_team_state
     SET captain_votes = v_votes, updated_at = now()
   WHERE room_id = p_room_id;

  SELECT count(*) INTO v_players
    FROM public.room_participants
   WHERE room_id = p_room_id AND status = 'playing';
  IF (SELECT count(*) FROM jsonb_object_keys(v_votes)) >= v_players THEN
    PERFORM public.kt_resolve_captain(p_room_id);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.kt_vote_captain(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kt_vote_captain(uuid, uuid) TO authenticated;

-- Most-voted player wins the election; ties (and a silent room) go to the
-- earliest joiner among the tied — somebody must hold the wheel. Opens
-- round 0, question 0.
CREATE OR REPLACE FUNCTION public.kt_resolve_captain(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.king_team_state%ROWTYPE;
  v_captain uuid;
BEGIN
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'captain_vote' THEN
    RETURN;
  END IF;

  SELECT rp.user_id INTO v_captain
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS votes
        FROM jsonb_each_text(v_state.captain_votes) AS v(voter, candidate)
       WHERE v.candidate = rp.user_id::text
    ) tally ON true
   WHERE rp.room_id = p_room_id AND rp.status = 'playing'
   ORDER BY tally.votes DESC, rp.joined_at ASC NULLS LAST
   LIMIT 1;

  UPDATE public.king_team_state
     SET phase = 'question',
         captain_user_id = v_captain,
         captain_votes = '{}'::jsonb,
         picks = '{}'::jsonb,
         final_answer = NULL,
         deadline = now() + interval '25 seconds',
         updated_at = now()
   WHERE room_id = p_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.kt_resolve_captain(uuid) FROM PUBLIC, anon, authenticated;

-- A player's advisory vote on the current question. Changeable until the
-- captain locks or the clock runs out; the captain votes like anyone else.
CREATE OR REPLACE FUNCTION public.kt_pick_answer(p_room_id uuid, p_option text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.king_team_state%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'question' THEN
    RAISE EXCEPTION 'No question is open';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = v_caller AND status = 'playing'
  ) THEN
    RAISE EXCEPTION 'Not a player of this match';
  END IF;

  UPDATE public.king_team_state
     SET picks = picks || jsonb_build_object(v_caller::text, p_option),
         updated_at = now()
   WHERE room_id = p_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.kt_pick_answer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kt_pick_answer(uuid, text) TO authenticated;

-- The captain locks the team's answer. Resolves the question immediately —
-- the reveal does not wait for the clock.
CREATE OR REPLACE FUNCTION public.kt_final_answer(p_room_id uuid, p_option text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.king_team_state%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'question' THEN
    RAISE EXCEPTION 'No question is open';
  END IF;
  IF v_state.captain_user_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the captain locks the final answer';
  END IF;

  PERFORM public.kt_resolve_question(p_room_id, p_option, true);
END;
$$;

REVOKE ALL ON FUNCTION public.kt_final_answer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kt_final_answer(uuid, text) TO authenticated;

-- The captain's blitz shot at 3:3. Correct wins the match; anything else —
-- including the clock running out (kt_advance) — crowns the King.
CREATE OR REPLACE FUNCTION public.kt_blitz_answer(p_room_id uuid, p_option text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.king_team_state%ROWTYPE;
  v_correct text;
  v_won boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'blitz' THEN
    RAISE EXCEPTION 'No blitz is open';
  END IF;
  IF v_state.captain_user_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the captain plays the blitz';
  END IF;

  SELECT q ->> 'correct_answer' INTO v_correct
    FROM public.king_team_board b,
         LATERAL jsonb_array_elements(b.questions) WITH ORDINALITY AS t(q, ord)
   WHERE b.game_id = v_state.game_id AND b.round_index = 6 AND t.ord = 1;

  v_won := p_option = v_correct;

  UPDATE public.king_team_state
     SET phase = 'done',
         winner = CASE WHEN v_won THEN 'team' ELSE 'king' END,
         deadline = NULL,
         last_reveal = jsonb_build_object(
           'final', p_option, 'correct_answer', v_correct,
           'was_correct', v_won, 'blitz', true),
         updated_at = now()
   WHERE room_id = p_room_id;

  RETURN jsonb_build_object('correct', v_won, 'correct_answer', v_correct);
END;
$$;

REVOKE ALL ON FUNCTION public.kt_blitz_answer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kt_blitz_answer(uuid, text) TO authenticated;

-- The clock. Any device whose countdown crosses zero calls this; the first
-- caller moves the machine and the rest no-op (the tb_advance pattern).
CREATE OR REPLACE FUNCTION public.kt_advance(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.king_team_state%ROWTYPE;
  v_final text;
  v_top_votes integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Not a participant of this room';
  END IF;

  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase = 'done' THEN
    RETURN;
  END IF;
  IF v_state.deadline IS NULL OR now() < v_state.deadline THEN
    RETURN; -- nothing has expired; late/racing callers land here
  END IF;

  IF v_state.phase = 'captain_vote' THEN
    PERFORM public.kt_resolve_captain(p_room_id);

  ELSIF v_state.phase = 'question' THEN
    -- The captain sat on it: the team still answers. The captain's own pick
    -- stands in; failing that the room's most-voted; failing that silence
    -- (which can never match and scores for the King).
    v_final := v_state.picks ->> v_state.captain_user_id::text;
    IF v_final IS NULL THEN
      SELECT option INTO v_final FROM (
        SELECT v.value AS option, count(*) AS votes
          FROM jsonb_each_text(v_state.picks) AS v(voter, value)
         GROUP BY v.value
         ORDER BY votes DESC
         LIMIT 1
      ) top;
    END IF;
    PERFORM public.kt_resolve_question(p_room_id, v_final, false);

  ELSIF v_state.phase = 'reveal' THEN
    IF v_state.question_index < 4 THEN
      UPDATE public.king_team_state
         SET phase = 'question',
             question_index = question_index + 1,
             picks = '{}'::jsonb,
             final_answer = NULL,
             deadline = now() + interval '25 seconds',
             updated_at = now()
       WHERE room_id = p_room_id;
    ELSE
      -- Round over: three correct finals take it for the team.
      UPDATE public.king_team_state
         SET phase = 'round_result',
             team_rounds = team_rounds + CASE WHEN round_correct >= 3 THEN 1 ELSE 0 END,
             king_rounds = king_rounds + CASE WHEN round_correct >= 3 THEN 0 ELSE 1 END,
             deadline = now() + interval '5 seconds',
             updated_at = now()
       WHERE room_id = p_room_id;
    END IF;

  ELSIF v_state.phase = 'round_result' THEN
    IF v_state.round_index < 5 THEN
      UPDATE public.king_team_state
         SET phase = 'question',
             round_index = round_index + 1,
             question_index = 0,
             round_correct = 0,
             picks = '{}'::jsonb,
             final_answer = NULL,
             deadline = now() + interval '25 seconds',
             updated_at = now()
       WHERE room_id = p_room_id;
    ELSIF v_state.team_rounds <> v_state.king_rounds THEN
      UPDATE public.king_team_state
         SET phase = 'done',
             winner = CASE WHEN team_rounds > king_rounds THEN 'team' ELSE 'king' END,
             deadline = NULL,
             updated_at = now()
       WHERE room_id = p_room_id;
    ELSE
      -- 3:3 — the captain alone against the clock.
      UPDATE public.king_team_state
         SET phase = 'blitz',
             deadline = now() + interval '20 seconds',
             updated_at = now()
       WHERE room_id = p_room_id;
    END IF;

  ELSIF v_state.phase = 'blitz' THEN
    UPDATE public.king_team_state
       SET phase = 'done',
           winner = 'king',
           deadline = NULL,
           updated_at = now()
     WHERE room_id = p_room_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.kt_advance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kt_advance(uuid) TO authenticated;

-- Settlement: exactly once per match (the settled flag is the claim). Writes
-- the room_games completion snapshot and history, accumulates the cumulative
-- participant totals, pays every player their show-up coins and — when the
-- team dethroned the King — the win purse, and parks the room back at
-- waiting for a rematch.
CREATE OR REPLACE FUNCTION public.kt_settle(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.king_team_state%ROWTYPE;
  v_claimed uuid;
  v_reference text;
  v_scores jsonb;
  v_mvp uuid;
  v_player record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Not a participant of this room';
  END IF;

  SELECT * INTO v_state FROM public.king_team_state WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'done' THEN
    RAISE EXCEPTION 'Match is not finished';
  END IF;

  UPDATE public.king_team_state
     SET settled = true, updated_at = now()
   WHERE room_id = p_room_id AND settled = false
  RETURNING room_id INTO v_claimed;
  IF v_claimed IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'winner', v_state.winner);
  END IF;

  v_reference := p_room_id::text || ':' || v_state.game_id::text;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', user_id, 'nickname', nickname, 'avatar_url', avatar_url,
           'score', COALESCE(score, 0))
           ORDER BY COALESCE(score, 0) DESC), '[]'::jsonb)
    INTO v_scores
    FROM public.room_participants
   WHERE room_id = p_room_id AND status = 'playing';

  -- The per-player "winner" the history schema can hold: the captain when
  -- the team won (they locked the answers), else the top advisory scorer.
  IF v_state.winner = 'team' THEN
    v_mvp := v_state.captain_user_id;
  END IF;
  IF v_mvp IS NULL THEN
    SELECT user_id INTO v_mvp
      FROM public.room_participants
     WHERE room_id = p_room_id AND status = 'playing'
     ORDER BY COALESCE(score, 0) DESC, joined_at ASC NULLS LAST
     LIMIT 1;
  END IF;

  UPDATE public.room_games
     SET completed_at = now(),
         totals_applied = true,
         winner_user_id = v_mvp,
         player_scores = v_scores,
         questions_data = jsonb_build_object(
           'mode', 'versus_king',
           'team_rounds', v_state.team_rounds,
           'king_rounds', v_state.king_rounds,
           'winner', v_state.winner,
           'captain', v_state.captain_user_id)
   WHERE id = v_state.game_id;

  INSERT INTO public.room_match_history (room_id, winner_user_id, player_scores)
  VALUES (p_room_id, v_mvp, v_scores);

  FOR v_player IN
    SELECT user_id FROM public.room_participants
     WHERE room_id = p_room_id AND status = 'playing'
  LOOP
    UPDATE public.room_participants
       SET total_score = COALESCE(total_score, 0) + COALESCE(score, 0),
           total_rounds_played = COALESCE(total_rounds_played, 0) + 1,
           total_wins = COALESCE(total_wins, 0)
             + CASE WHEN v_state.winner = 'team' THEN 1 ELSE 0 END,
           last_played_at = now()
     WHERE room_id = p_room_id AND user_id = v_player.user_id;

    BEGIN
      PERFORM public.apply_currency_grant(
        v_player.user_id, 'king_play', 50, 0, v_reference);
      IF v_state.winner = 'team' THEN
        PERFORM public.apply_currency_grant(
          v_player.user_id, 'king_win', 200, 0, v_reference);
      END IF;
    EXCEPTION WHEN unique_violation THEN
      NULL; -- this match already paid this player; never pay twice
    END;
  END LOOP;

  UPDATE public.game_rooms
     SET status = 'waiting'::public.room_status,
         current_game_id = NULL,
         last_activity_at = now()
   WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'applied', true,
    'winner', v_state.winner,
    'team_rounds', v_state.team_rounds,
    'king_rounds', v_state.king_rounds);
END;
$$;

REVOKE ALL ON FUNCTION public.kt_settle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kt_settle(uuid) TO authenticated;
