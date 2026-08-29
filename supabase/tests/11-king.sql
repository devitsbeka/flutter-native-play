-- MyTrivia King, executed rather than reviewed (docs/GAME_TYPES_DESIGN.md §3).
--
-- The mode's promise is enforced by what the client cannot see and when:
-- no options during the think phase (not in the RPC result, not in any
-- readable table), server-stamped think and commit deadlines, the reveal
-- only after the commit, and once-only ledgered payouts. This plays a full
-- match to 6 through the public RPCs and asserts each of those claims,
-- plus the seed pool's own quality contract.
--
-- Same harness as the other suites (see README.md).

\set ON_ERROR_STOP on
\pset pager off

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE raised boolean := false;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN raised := true;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'ASSERTION FAILED (should have been refused): %', label;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, wanted %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

-- ── privilege posture ──────────────────────────────────────────────────────

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('king_start_match', 'king_draw_question', 'king_show_options',
                       'king_submit_answer', 'king_expire_question', 'king_abandon_match')
     AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'anon can call: % -- revoke FROM PUBLIC, anon', bad;
  END IF;
  RAISE NOTICE 'ok: no king RPC is reachable by anon';
END $$;

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('king_state', 'king_finish_question')
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'internal helper callable by a client role: %', bad;
  END IF;
  RAISE NOTICE 'ok: internal helpers are not callable by client roles';
END $$;

-- Both tables are invisible to clients: RLS on, zero policies. king_matches
-- matters as much as king_questions — the match row carries the shuffled
-- options during the think phase.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename IN ('king_questions', 'king_matches');
  PERFORM pg_temp.must_equal(n, 0::bigint, 'no client policies on king tables at all');
  SELECT count(*) INTO n FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relname IN ('king_questions', 'king_matches')
     AND c.relrowsecurity;
  PERFORM pg_temp.must_equal(n, 2::bigint, 'row level security is on for both king tables');
END $$;

-- ── the seed pool's own contract ───────────────────────────────────────────

DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.king_questions
   WHERE language = 'en' AND is_active;
  IF n < 20 THEN
    RAISE EXCEPTION 'expected a seeded English pool of at least 20, found %', n;
  END IF;
  SELECT count(*) INTO n FROM public.king_questions
   WHERE btrim(explanation) = ''
      OR jsonb_array_length(incorrect_answers) <> 3;
  PERFORM pg_temp.must_equal(n, 0::bigint,
    'every question carries an explanation and exactly 3 distractors');
END $$;

-- ── a full match ───────────────────────────────────────────────────────────

DO $$
DECLARE
  v_player uuid := 'ac000000-0000-0000-0000-00000000000a';
  v_out    uuid := 'ac000000-0000-0000-0000-00000000000b';
  v_state jsonb;
  v_match uuid;
  v_first_match uuid;
  v_qid uuid;
  v_answer text;
  v_deadline text;
  v_coins_before integer;
  v_cracked integer := 0;
  i integer;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_player, 'kingplayer@tb.test'), (v_out, 'kingout@tb.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
    (v_player, 'kingplayer', 1000, 0), (v_out, 'kingout', 1000, 0)
  ON CONFLICT (user_id) DO UPDATE SET coins = 1000, gems = 0;
  DELETE FROM public.currency_grants WHERE user_id IN (v_player, v_out);
  DELETE FROM public.king_matches WHERE user_id IN (v_player, v_out);

  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail('SELECT public.king_start_match(''en'')',
    'anonymous caller cannot start a match');

  PERFORM pg_temp.as_user(v_player);
  v_state := public.king_start_match('en');
  v_match := (v_state ->> 'match_id')::uuid;
  v_first_match := v_match;
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'playing', 'a match starts playing');
  PERFORM pg_temp.must_equal((v_state ->> 'player_score')::int, 0, 'scores open at zero');

  -- The think phase: question text yes, options no, answers never.
  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_draw_question(%L)', v_match),
    'another user cannot draw on my match');

  PERFORM pg_temp.as_user(v_player);
  v_state := public.king_draw_question(v_match);
  PERFORM pg_temp.must_equal((v_state -> 'question') IS NOT NULL, true, 'a drawn question has text');
  PERFORM pg_temp.must_equal(v_state ? 'options', false, 'no options during the think phase');
  PERFORM pg_temp.must_equal(v_state ? 'correct_answer', false, 'no answer in the draw payload');
  PERFORM pg_temp.must_equal(v_state ? 'explanation', false, 'no explanation in the draw payload');

  -- Drawing again mid-question resumes it, it does not reroll.
  SELECT current_question_id INTO v_qid FROM public.king_matches WHERE id = v_match;
  v_state := public.king_draw_question(v_match);
  PERFORM pg_temp.must_equal(
    (SELECT current_question_id FROM public.king_matches WHERE id = v_match), v_qid,
    'a second draw resumes the same question');

  PERFORM pg_temp.must_fail(
    format('SELECT public.king_submit_answer(%L, %L)', v_match, 'anything'),
    'no commit before the options are on screen');

  -- The commit phase opens once and only once.
  v_state := public.king_show_options(v_match);
  PERFORM pg_temp.must_equal(jsonb_array_length(v_state -> 'options'), 4, 'four options appear');
  v_deadline := v_state ->> 'commit_deadline';
  v_state := public.king_show_options(v_match);
  PERFORM pg_temp.must_equal(v_state ->> 'commit_deadline', v_deadline,
    'reopening the options never restarts the commit clock');

  -- Miss on purpose: the King scores and the reveal explains the answer.
  SELECT coins INTO v_coins_before FROM public.profiles WHERE user_id = v_player;
  v_state := public.king_submit_answer(v_match, 'definitely not the answer');
  PERFORM pg_temp.must_equal((v_state ->> 'correct')::boolean, false, 'a miss is a miss');
  PERFORM pg_temp.must_equal((v_state ->> 'king_score')::int, 1, 'the King takes the point');
  PERFORM pg_temp.must_equal(length(v_state ->> 'explanation') > 0, true,
    'the reveal carries the derivation');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_player), v_coins_before,
    'a miss pays nothing');

  -- A dead commit window refuses the answer and only then may be expired.
  v_state := public.king_draw_question(v_match);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_expire_question(%L)', v_match),
    'a live question cannot be expired early');
  PERFORM public.king_show_options(v_match);
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.king_matches SET options_at = now() - interval '13 seconds' WHERE id = v_match;
  PERFORM pg_temp.as_user(v_player);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_submit_answer(%L, %L)', v_match, 'too late'),
    'a commit after the window is refused');
  v_state := public.king_expire_question(v_match);
  PERFORM pg_temp.must_equal((v_state ->> 'king_score')::int, 2, 'a timeout scores for the King');

  -- Crack six in a row (the fixture reads the answers as superuser; a client
  -- has no such channel) and the match is won and paid exactly once.
  FOR i IN 1..6 LOOP
    v_state := public.king_draw_question(v_match);
    PERFORM public.king_show_options(v_match);
    SELECT q.correct_answer INTO v_answer
      FROM public.king_matches m JOIN public.king_questions q ON q.id = m.current_question_id
     WHERE m.id = v_match;
    v_state := public.king_submit_answer(v_match, v_answer);
    v_cracked := v_cracked + 1;
    PERFORM pg_temp.must_equal((v_state ->> 'player_score')::int, i, 'crack ' || i || ' counts');
  END LOOP;

  PERFORM pg_temp.must_equal(v_state ->> 'status', 'won', 'six cracks win the match');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_player),
    v_coins_before + v_cracked * 10 + 200,
    'payout is 10 per crack plus 200 for the crown');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.currency_grants
      WHERE user_id = v_player AND kind = 'king_win'), 1,
    'the crown is paid exactly once');

  PERFORM pg_temp.must_fail(
    format('SELECT public.king_draw_question(%L)', v_match),
    'a finished match deals no more questions');

  -- A new start after a finished match is a fresh match; a killed app inside
  -- a running one resumes it instead.
  v_state := public.king_start_match('en');
  v_match := (v_state ->> 'match_id')::uuid;
  PERFORM pg_temp.must_equal(v_match IS DISTINCT FROM v_first_match, true,
    'a finished match is never resumed');
  PERFORM public.king_draw_question(v_match);
  v_state := public.king_start_match('en');
  PERFORM pg_temp.must_equal((v_state ->> 'match_id')::uuid, v_match,
    'a running match is resumed, not replaced');
  PERFORM pg_temp.must_equal((v_state -> 'question') IS NOT NULL, true,
    'the resume carries the live question');

  -- Resuming into a commit window that died while the app was gone closes
  -- that question against the player first.
  PERFORM public.king_show_options(v_match);
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.king_matches SET options_at = now() - interval '13 seconds' WHERE id = v_match;
  PERFORM pg_temp.as_user(v_player);
  v_state := public.king_start_match('en');
  PERFORM pg_temp.must_equal((v_state ->> 'king_score')::int, 1,
    'backgrounding through the commit window is not a free retry');

  -- Walking away.
  v_state := public.king_abandon_match(v_match);
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'abandoned', 'abandoning ends the match');
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_abandon_match(%L)', v_match),
    'a finished match cannot be abandoned again');

  -- Cleanup so reruns start clean.
  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.king_matches WHERE user_id IN (v_player, v_out);
  DELETE FROM public.currency_grants WHERE user_id IN (v_player, v_out);
END $$;

\echo 'ok: the King deals, judges, and pays by the rules'
