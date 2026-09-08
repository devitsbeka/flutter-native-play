-- submit_tv_answer identity binding and server-side scoring, executed
-- rather than reviewed.
--
-- Confirmed live against production before this fix: a call naming a real
-- other player's player_id credited that player's score from an attacker's
-- own session, and a call claiming 999,000,000 points was accepted
-- verbatim. 20261016130000_tv_answer_bound_and_verified.sql closes both —
-- these assertions are the regression guard.
--
-- Same harness as the other suites (see README.md).

\set ON_ERROR_STOP on
\pset pager off

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

DO $$
DECLARE
  v_session   uuid;
  v_host      uuid := 'ee000000-0000-0000-0000-000000000001';
  v_guest_1   text := 'ee100000-0000-0000-0000-0000000000a1';
  v_token_1   uuid := 'ee100000-0000-0000-0000-0000000000b1';
  v_token_bad uuid := 'ee100000-0000-0000-0000-0000000000bb';
  v_result    jsonb;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (v_host, 'host@tvfix.test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname) VALUES (v_host, 'Host')
  ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  INSERT INTO public.tv_sessions (tv_pairing_code, status, current_question_index, questions, expires_at)
  VALUES ('9911', 'playing', 0,
    '[{"id":"q1","question_text":"2+2?","correct_answer":"4","options":["3","4","5"]}]'::jsonb,
    now() + interval '1 hour')
  RETURNING id INTO v_session;

  -- ── a brand-new guest player_id, answering correctly, lying about it ──────
  -- Claims p_is_correct=false and p_points=999000000; the server must ignore
  -- both and derive the truth from the question's own correct_answer.
  SET LOCAL ROLE anon;
  PERFORM pg_temp.as_user(NULL);
  v_result := public.submit_tv_answer(
    v_session, v_guest_1, 0, '4', false, 999000000, 10,
    'Guest One', NULL, v_token_1);
  RESET ROLE;

  PERFORM pg_temp.must_equal((v_result->>'accepted')::boolean, true,
    'a brand-new guest player_id can answer (self-heals its own roster row)');
  PERFORM pg_temp.must_equal((v_result->>'is_correct')::boolean, true,
    'server derives correctness from the question, not from the caller''s claim');
  PERFORM pg_temp.must_equal((v_result->>'points')::integer, 200,
    'server computes points from time remaining (100 base + 10*10), not the claimed 999000000');
  PERFORM pg_temp.must_equal((v_result->>'player_total')::integer, 200,
    'the inflated claim never reaches the player''s stored total either');

  PERFORM pg_temp.must_equal(
    (SELECT user_id FROM public.tv_players WHERE tv_session_id = v_session AND player_id = v_guest_1),
    NULL::uuid,
    'the self-healed row is unauthenticated (user_id null), not the untrusted player_id cast — '
    'the original bug hard-failed this exact case on the auth.users foreign key');
  PERFORM pg_temp.must_equal(
    (SELECT answer_token FROM public.tv_players WHERE tv_session_id = v_session AND player_id = v_guest_1),
    v_token_1,
    'the token presented on first answer is the one now on record (trust-on-first-use)');

  -- ── a stranger, with no session of their own, tries to answer AS v_guest_1 ─
  -- This is the exact live exploit: crediting a real other player from an
  -- attacker's own anonymous call. Wrong token must be refused outright, not
  -- merely re-scored differently.
  SET LOCAL ROLE anon;
  PERFORM pg_temp.as_user(NULL);
  v_result := public.submit_tv_answer(
    v_session, v_guest_1, 0, '4', true, 5000000, 10,
    'Guest One', NULL, v_token_bad);
  RESET ROLE;

  PERFORM pg_temp.must_equal((v_result->>'accepted')::boolean, false,
    'a stranger presenting the wrong token cannot answer as an existing guest player_id');
  PERFORM pg_temp.must_equal(v_result->>'reason', 'bad_answer_token',
    'the refusal names the actual reason');
  PERFORM pg_temp.must_equal(
    (SELECT current_round_score FROM public.tv_players WHERE tv_session_id = v_session AND player_id = v_guest_1),
    200,
    'the victim''s score is untouched by the forged call');

  -- ── the same real guest, submitting again with the right token, is fine ───
  SET LOCAL ROLE anon;
  PERFORM pg_temp.as_user(NULL);
  v_result := public.submit_tv_answer(
    v_session, v_guest_1, 0, '4', true, 200, 10,
    'Guest One', NULL, v_token_1);
  RESET ROLE;
  PERFORM pg_temp.must_equal((v_result->>'accepted')::boolean, true,
    'the legitimate holder of the token can still answer (a resubmit/retry)');

  -- ── a signed-in caller does not need a token — auth.uid() already proves it
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_host);
  v_result := public.submit_tv_answer(
    v_session, v_host::text, 0, '4', true, 200, 5,
    'Host', NULL, NULL);
  RESET ROLE;
  PERFORM pg_temp.must_equal((v_result->>'accepted')::boolean, true,
    'a signed-in caller answering as themselves needs no token at all');
  PERFORM pg_temp.must_equal((v_result->>'points')::integer, 150,
    'server-computed from p_time_remaining=5: 100 + 5*10');

  -- ── a signed-in caller cannot answer as someone else's player_id either ───
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user(v_host);
  v_result := public.submit_tv_answer(
    v_session, v_guest_1, 0, '4', true, 200, 10,
    'Guest One', NULL, v_token_1);
  RESET ROLE;
  PERFORM pg_temp.must_equal((v_result->>'accepted')::boolean, false,
    'being signed in as someone else is not a way around the identity check');
  PERFORM pg_temp.must_equal(v_result->>'reason', 'player_id_mismatch',
    'refused because the authenticated caller is not this player_id, token or not');
END $$;

-- ── tv_advance_question reactivates a late joiner instead of leaving them
--    parked forever ───────────────────────────────────────────────────────
DO $$
DECLARE
  v_session uuid;
  v_late    text := 'ee200000-0000-0000-0000-0000000000c1';
  v_result  jsonb;
BEGIN
  INSERT INTO public.tv_sessions (
    tv_pairing_code, status, current_question_index, questions,
    reveal_start_time, expires_at
  ) VALUES (
    '9922', 'reveal', 0,
    '[{"id":"q1","correct_answer":"4"}, {"id":"q2","correct_answer":"5"}]'::jsonb,
    now() - interval '15 seconds', -- past the 1.4s/10s reveal floor either way
    now() + interval '1 hour'
  ) RETURNING id INTO v_session;

  -- A player who joined mid-question, parked inactive on purpose.
  INSERT INTO public.tv_players (tv_session_id, player_id, nickname, is_active, current_round_score)
  VALUES (v_session, v_late, 'Late Joiner', false, 0);

  v_result := public.tv_advance_question(v_session);
  PERFORM pg_temp.must_equal((v_result->>'advanced')::boolean, true, 'the advance itself still succeeds');
  PERFORM pg_temp.must_equal(
    (SELECT is_active FROM public.tv_players WHERE tv_session_id = v_session AND player_id = v_late),
    true,
    'a late joiner parked inactive for the question they joined during is reactivated '
    'the moment a genuinely new question starts — this used to stay false forever, '
    'since the only code that flipped it back never runs once the DB (not the host''s '
    'phone) is the one performing this exact transition');
END $$;

\echo 'ok: submit_tv_answer is bound to the caller and scores from the truth, tv_advance_question reactivates late joiners'
