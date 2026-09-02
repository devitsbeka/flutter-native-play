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
  -- The Georgian pool: the launch-day bug was a ka-language player against
  -- an EN-only pool — king_draw_question draws strictly by language.
  SELECT count(*) INTO n FROM public.king_questions
   WHERE language = 'ka' AND is_active;
  IF n < 20 THEN
    RAISE EXCEPTION 'expected a seeded Georgian pool of at least 20, found %', n;
  END IF;
  SELECT count(*) INTO n FROM public.king_questions
   WHERE source = 'seed-ka-1' AND translated_from IS NULL;
  PERFORM pg_temp.must_equal(n, 0::bigint,
    'every Georgian question points at its English source');
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

  -- The dark launch holds at the start RPC, not just in the chooser.
  PERFORM pg_temp.as_user(v_player);
  PERFORM pg_temp.must_fail('SELECT public.king_start_match(''en'')',
    'a non-live mode starts no matches');
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.game_types SET is_live = true WHERE key = 'king';

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

  -- The think phase is a server deadline too: a client that sat on the
  -- question past the window gets no commit phase — the King takes it.
  v_state := public.king_draw_question(v_match);
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.king_matches SET drawn_at = now() - interval '80 seconds' WHERE id = v_match;
  PERFORM pg_temp.as_user(v_player);
  v_state := public.king_show_options(v_match);
  PERFORM pg_temp.must_equal((v_state ->> 'king_score')::int, 3,
    'an overstayed think phase closes against the player');
  PERFORM pg_temp.must_equal(v_state ? 'options', false,
    'no commit window opens after the think deadline');

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

  -- Cleanup so reruns start clean — the mode goes back to dark.
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.game_types SET is_live = false WHERE key = 'king';
  DELETE FROM public.king_matches WHERE user_id IN (v_player, v_out);
  DELETE FROM public.currency_grants WHERE user_id IN (v_player, v_out);
END $$;

\echo 'ok: the King deals, judges, and pays by the rules'

-- ══ the co-op couch (20260921170000): one duel, the captain decides ════════

DO $$
DECLARE
  v_host uuid := 'aaaa1111-0000-4000-8000-00000000c001'::uuid;
  v_mate uuid := 'aaaa1111-0000-4000-8000-00000000c002'::uuid;
  v_out  uuid := 'aaaa1111-0000-4000-8000-00000000c003'::uuid;
  v_room uuid;
  v_state jsonb;
  v_match uuid;
  v_correct text;
  v_wrong text;
  v_host_coins integer;
  v_mate_coins integer;
  i integer := 0;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'coophost@tb.test'), (v_mate, 'coopmate@tb.test'), (v_out, 'coopout@tb.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
    (v_host, 'coophost', 1000, 0), (v_mate, 'coopmate', 1000, 0), (v_out, 'coopout', 1000, 0)
  ON CONFLICT (user_id) DO UPDATE SET coins = 1000, gems = 0;
  DELETE FROM public.currency_grants WHERE user_id IN (v_host, v_mate, v_out);
  DELETE FROM public.king_matches WHERE user_id IN (v_host, v_mate, v_out);

  INSERT INTO public.game_rooms (room_code, host_user_id, status, game_type_key)
  VALUES ('KINGCO', v_host, 'waiting', 'king') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_room, v_host, 'coophost', true, 'joined'),
         (v_room, v_mate, 'coopmate', false, 'joined');

  -- Start: members only, host only; a second start resumes.
  PERFORM pg_temp.as_user(v_mate);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_start(%L, %L)', v_room, 'en'),
    'only the host starts the team duel');
  PERFORM pg_temp.as_user(v_host);
  v_state := public.king_team_start(v_room, 'en');
  v_match := (v_state ->> 'match_id')::uuid;
  PERFORM pg_temp.must_equal(v_state ->> 'status', 'playing', 'the team duel starts playing');
  PERFORM pg_temp.must_equal((v_state ->> 'captain')::uuid, v_host, 'the host wears the armband');
  PERFORM pg_temp.must_equal((v_state -> 'question') IS NOT NULL, true, 'the first question is drawn');
  PERFORM pg_temp.must_equal((v_state -> 'options') IS NULL, true, 'options stay hidden through the think minute');
  v_state := public.king_team_start(v_room, 'en');
  PERFORM pg_temp.must_equal((v_state ->> 'match_id')::uuid, v_match, 'a running duel resumes, not restarts');

  -- The whole couch reads the match; outsiders read nothing.
  PERFORM pg_temp.as_user(v_mate);
  v_state := public.king_team_view(v_room);
  PERFORM pg_temp.must_equal((v_state ->> 'match_id')::uuid, v_match, 'a teammate sees the shared duel');
  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_view(%L)', v_room),
    'an outsider sees nothing');

  -- Options: not before the captain opens them; captain-only.
  PERFORM pg_temp.as_user(v_mate);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_suggest(%L, %L)', v_room, 'x'),
    'no suggestions before the options open');
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_options(%L)', v_room),
    'only the captain opens the options');
  PERFORM pg_temp.as_user(v_host);
  v_state := public.king_team_options(v_room);
  PERFORM pg_temp.must_equal((v_state -> 'options') IS NOT NULL, true, 'the captain opens the options');

  PERFORM pg_temp.as_user(NULL);
  SELECT q.correct_answer INTO v_correct
    FROM public.king_team_matches m JOIN public.king_questions q ON q.id = m.current_question_id
   WHERE m.id = v_match;
  SELECT value #>> '{}' INTO v_wrong
    FROM jsonb_array_elements((SELECT options FROM public.king_team_matches WHERE id = v_match))
   WHERE value #>> '{}' <> v_correct LIMIT 1;

  -- Suggestions: members only, real options only, re-tapping changes it.
  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_suggest(%L, %L)', v_room, v_correct),
    'an outsider cannot suggest');
  PERFORM pg_temp.as_user(v_mate);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_suggest(%L, %L)', v_room, 'NOT AN OPTION'),
    'a suggestion must be one of the options');
  PERFORM public.king_team_suggest(v_room, v_wrong);
  v_state := public.king_team_suggest(v_room, v_correct);
  PERFORM pg_temp.must_equal(v_state -> 'suggestions' ->> v_mate::text, v_correct,
    're-tapping changes the suggestion');

  -- Commit: captain-only; a crack pays the whole couch, once.
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_commit(%L, %L)', v_room, v_correct),
    'only the captain locks the answer');
  SELECT coins INTO v_host_coins FROM public.profiles WHERE user_id = v_host;
  SELECT coins INTO v_mate_coins FROM public.profiles WHERE user_id = v_mate;
  PERFORM pg_temp.as_user(v_host);
  v_state := public.king_team_commit(v_room, v_correct);
  PERFORM pg_temp.must_equal((v_state ->> 'team_score')::int, 1, 'a correct lock scores the team');
  PERFORM pg_temp.must_equal((v_state -> 'last_result' ->> 'correct')::boolean, true,
    'the reveal carries the outcome');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_host), v_host_coins + 10,
    'a crack pays the captain');
  PERFORM pg_temp.must_equal(
    (SELECT coins FROM public.profiles WHERE user_id = v_mate), v_mate_coins + 10,
    'a crack pays the whole couch');
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_commit(%L, %L)', v_room, v_correct),
    'a resolved question cannot be locked again');

  -- Anyone pulls the next question.
  PERFORM pg_temp.as_user(v_mate);
  v_state := public.king_team_next(v_room);
  PERFORM pg_temp.must_equal((v_state -> 'question') IS NOT NULL, true,
    'any teammate pulls the next question');

  -- The pump opens options at the think deadline…
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.king_team_matches SET drawn_at = now() - interval '61 seconds' WHERE id = v_match;
  PERFORM pg_temp.as_user(v_mate);
  v_state := public.king_team_advance(v_room);
  PERFORM pg_temp.must_equal((v_state -> 'options') IS NOT NULL, true,
    'the pump opens options at the think deadline');

  -- …and at the commit deadline the majority locks itself, the captain's
  -- pick breaking ties — here 1-1, and the captain chose wrong.
  PERFORM pg_temp.as_user(NULL);
  SELECT q.correct_answer INTO v_correct
    FROM public.king_team_matches m JOIN public.king_questions q ON q.id = m.current_question_id
   WHERE m.id = v_match;
  SELECT value #>> '{}' INTO v_wrong
    FROM jsonb_array_elements((SELECT options FROM public.king_team_matches WHERE id = v_match))
   WHERE value #>> '{}' <> v_correct LIMIT 1;
  PERFORM pg_temp.as_user(v_mate);
  PERFORM public.king_team_suggest(v_room, v_correct);
  PERFORM pg_temp.as_user(v_host);
  PERFORM public.king_team_suggest(v_room, v_wrong);
  PERFORM pg_temp.as_user(NULL);
  UPDATE public.king_team_matches SET options_at = now() - interval '21 seconds' WHERE id = v_match;
  PERFORM pg_temp.as_user(v_mate);
  v_state := public.king_team_advance(v_room);
  PERFORM pg_temp.must_equal((v_state -> 'last_result' ->> 'correct')::boolean, false,
    'a tied deadline locks the captain''s pick');
  PERFORM pg_temp.must_equal((v_state ->> 'king_score')::int, 1, 'the miss is the King''s point');

  -- Play to the crown.
  LOOP
    i := i + 1;
    IF i > 12 THEN RAISE EXCEPTION 'the team duel did not converge'; END IF;
    PERFORM pg_temp.as_user(v_mate);
    PERFORM public.king_team_next(v_room);
    PERFORM pg_temp.as_user(v_host);
    PERFORM public.king_team_options(v_room);
    PERFORM pg_temp.as_user(NULL);
    SELECT q.correct_answer INTO v_correct
      FROM public.king_team_matches m JOIN public.king_questions q ON q.id = m.current_question_id
     WHERE m.id = v_match;
    PERFORM pg_temp.as_user(v_host);
    v_state := public.king_team_commit(v_room, v_correct);
    EXIT WHEN v_state ->> 'status' = 'won';
  END LOOP;
  PERFORM pg_temp.must_equal((v_state ->> 'team_score')::int, 6, 'first to six takes the crown');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.currency_grants
      WHERE kind = 'king_win' AND reference = 'team:' || v_match::text
        AND user_id IN (v_host, v_mate)), 2,
    'the crown pays every human on the couch');
  PERFORM pg_temp.as_user(v_mate);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_next(%L)', v_room),
    'a finished duel takes no more questions');

  -- Cleanup so reruns start clean.
  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.king_team_matches WHERE room_id = v_room;
  DELETE FROM public.room_participants WHERE room_id = v_room;
  DELETE FROM public.game_rooms WHERE id = v_room;
  DELETE FROM public.currency_grants WHERE user_id IN (v_host, v_mate, v_out);
END $$;

\echo 'ok: the couch fights one King and the captain answers for it'

-- ══ every language of the app can face the King (20260921180000) ═══════════

DO $$
DECLARE
  v_lang text;
  v_count integer;
BEGIN
  FOREACH v_lang IN ARRAY ARRAY['en','ka','es','de','fr','it','pt'] LOOP
    SELECT count(*) INTO v_count FROM public.king_questions
     WHERE language = v_lang AND is_active AND icon_slug IS NOT NULL;
    IF v_count < 24 THEN
      RAISE EXCEPTION 'language % has only % iconed active questions', v_lang, v_count;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  v_u uuid := 'aaaa1111-0000-4000-8000-00000000c010'::uuid;
  v_room uuid;
  v_state jsonb;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (v_u, 'kinglang@tb.test') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname, coins, gems)
  VALUES (v_u, 'kinglang', 0, 0) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.game_rooms (room_code, host_user_id, status, game_type_key)
  VALUES ('KINGLN', v_u, 'waiting', 'king') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status)
  VALUES (v_room, v_u, 'kinglang', true, 'joined');

  PERFORM pg_temp.as_user(v_u);
  v_state := public.king_team_start(v_room, 'it');
  PERFORM pg_temp.must_equal((v_state -> 'question') IS NOT NULL, true,
    'the Italian pool deals a question');

  -- A language with no pool at all borrows the English one instead of
  -- dead-ending into KING_NO_QUESTIONS.
  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.king_team_matches WHERE room_id = v_room;
  PERFORM pg_temp.as_user(v_u);
  v_state := public.king_team_start(v_room, 'xx');
  PERFORM pg_temp.must_equal((v_state -> 'question') IS NOT NULL, true,
    'an unknown language borrows the English pool');

  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.king_team_matches WHERE room_id = v_room;
  DELETE FROM public.room_participants WHERE room_id = v_room;
  DELETE FROM public.game_rooms WHERE id = v_room;
END $$;

\echo 'ok: the King speaks all seven languages'

-- ══ the couch elects its captain (20260925100000) ══════════════════════════

DO $$
DECLARE
  v_host uuid := 'aaaa1111-0000-4000-8000-00000000c101'::uuid;
  v_mate uuid := 'aaaa1111-0000-4000-8000-00000000c102'::uuid;
  v_third uuid := 'aaaa1111-0000-4000-8000-00000000c103'::uuid;
  v_out  uuid := 'aaaa1111-0000-4000-8000-00000000c104'::uuid;
  v_room uuid;
  v_state jsonb;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_host, 'cvhost@tb.test'), (v_mate, 'cvmate@tb.test'),
    (v_third, 'cvthird@tb.test'), (v_out, 'cvout@tb.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
    (v_host, 'cvhost', 0, 0), (v_mate, 'cvmate', 0, 0),
    (v_third, 'cvthird', 0, 0), (v_out, 'cvout', 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.game_rooms (room_code, host_user_id, status, game_type_key)
  VALUES ('KINGCV', v_host, 'waiting', 'king') RETURNING id INTO v_room;
  INSERT INTO public.room_participants (room_id, user_id, nickname, is_host, status, joined_at)
  VALUES (v_room, v_host,  'cvhost',  true,  'joined', now() - interval '3 minutes'),
         (v_room, v_mate,  'cvmate',  false, 'joined', now() - interval '2 minutes'),
         (v_room, v_third, 'cvthird', false, 'joined', now() - interval '1 minute');

  -- Only the couch votes, and only for someone on it.
  PERFORM pg_temp.as_user(v_out);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_vote_captain(%L, %L)', v_room, v_mate),
    'an outsider has no vote on the couch');
  PERFORM pg_temp.as_user(v_mate);
  PERFORM pg_temp.must_fail(
    format('SELECT public.tb_vote_captain(%L, %L)', v_room, v_out),
    'the couch cannot elect someone who is not on it');

  -- Two of three back the mate: the host loses the armband before the
  -- duel starts.
  PERFORM public.tb_vote_captain(v_room, v_mate);
  PERFORM pg_temp.as_user(v_third);
  PERFORM public.tb_vote_captain(v_room, v_mate);
  PERFORM pg_temp.must_equal(
    (SELECT is_captain FROM public.room_participants WHERE room_id = v_room AND user_id = v_mate),
    true, 'the couch''s plurality leader wears the armband');
  PERFORM pg_temp.must_equal(
    (SELECT count(*)::int FROM public.room_participants WHERE room_id = v_room AND is_captain),
    1, 'one captain on the couch');

  -- Starting is still the host's call, but the duel seats the elected
  -- captain, not the host.
  PERFORM pg_temp.as_user(v_mate);
  PERFORM pg_temp.must_fail(
    format('SELECT public.king_team_start(%L, %L)', v_room, 'en'),
    'an elected captain does not get to start the duel');
  PERFORM pg_temp.as_user(v_host);
  v_state := public.king_team_start(v_room, 'en');
  PERFORM pg_temp.must_equal((v_state ->> 'captain')::uuid, v_mate,
    'the duel seats the captain the couch voted in');

  PERFORM pg_temp.as_user(NULL);
  DELETE FROM public.king_team_matches WHERE room_id = v_room;
  DELETE FROM public.room_participants WHERE room_id = v_room;
  DELETE FROM public.game_rooms WHERE id = v_room;
END $$;

\echo 'ok: the couch elects its captain and the duel seats them'
