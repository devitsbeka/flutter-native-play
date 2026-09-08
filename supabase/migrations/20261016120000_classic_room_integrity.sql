-- Classic multiplayer rooms: three integrity gaps found by direct-network
-- stress testing (docs/qa-app-store-2026-09/02-classic-rooms-findings.md),
-- none of which needed a client rebuild because all three are server-side.

-- ── 1. A duplicate/retried answer submission double-pays (Finding 1) ───────
--
-- 20260126010141 moved player_answers' uniqueness from
-- UNIQUE(room_id, user_id, question_index) to
-- UNIQUE(tv_session_id, user_id, question_index), so TV mode's per-session
-- answers could coexist. For a classic room tv_session_id is always NULL,
-- and Postgres treats every NULL as distinct from every other NULL in a
-- unique constraint — so classic rooms have had no duplicate-answer
-- protection since that migration landed. A retried network request or a
-- double-tap on the answer button inserted the row twice and paid the
-- question twice.
--
-- The client's insert is already a bare, unchecked INSERT with no "change
-- your answer" flow above it (MultiplayerGameScreenV2 locks selectedAnswer
-- the instant the first tap lands, so a second legitimate submission for the
-- same question never happens) — a plain uniqueness fix is enough; no
-- upsert is needed because nothing legitimately replaces an answer.
CREATE UNIQUE INDEX IF NOT EXISTS player_answers_classic_room_unique
  ON public.player_answers (room_id, user_id, question_index)
  WHERE tv_session_id IS NULL;

-- The claim/no-op idiom below depends on player_answers knowing whether a
-- row has already been paid; nothing recorded that before. Added here, ahead
-- of the function that reads and writes it.
ALTER TABLE public.player_answers
  ADD COLUMN IF NOT EXISTS scored boolean NOT NULL DEFAULT false;

-- ── 2. increment_participant_score had no per-question cap, only a
--      per-call cap (Finding 2) ─────────────────────────────────────────────
--
-- A signed-in participant could call increment_participant_score(room,
-- delta) directly, with no player_answers row behind it at all — confirmed:
-- three direct calls at the 275-per-call clamp took a fresh participant from
-- 0 to 825 with player_answers staying empty the whole time. The 20260815
-- clamp bounded how FAST a call could cheat, not whether it could.
--
-- Fixed by making the award transactional with the answer: the function now
-- takes (room, question_index), claims the caller's own player_answers row
-- for that question with an atomic UPDATE ... WHERE scored = false (the same
-- "the row is the truth, exactly once" idiom complete_room_round and
-- settle_most_likely_votes already use), and computes the award itself from
-- BASE_POINTS + a whole second's time bonus — the same formula
-- calculatePoints() uses in src/utils/scoring.ts — plus FIRST_ANSWER_BONUS
-- if this user's own room_first_correct claim exists for the question. A
-- forged points_earned on a directly-inserted row buys nothing: the payout
-- is recomputed from time_remaining and is_correct, not read back off the
-- client's number.
--
-- No matching answer, a wrong one, an already-scored one, or a "Most Likely
-- To" vote question (settled separately by settle_most_likely_votes once the
-- majority is known, never per-answer) all claim nothing and return
-- silently — a retry landing here is exactly that last case, and must stay
-- silent rather than surface an error.
--
-- Same argument TYPES as the old (uuid, integer) signature it replaces (a
-- raw delta becomes a question index) — Postgres won't let CREATE OR REPLACE
-- rename a parameter on an existing signature, so the old one is dropped
-- outright first. Nothing can call the old delta shape after this; it isn't
-- left behind as a second overload.
DROP FUNCTION IF EXISTS public.increment_participant_score(uuid, integer);

CREATE OR REPLACE FUNCTION public.increment_participant_score(
  p_room_id uuid,
  p_question_index integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_claimed_id uuid;
  v_time_remaining numeric;
  v_award integer;
  -- 100 + 15 * 10 + 25, mirrored by MAX_QUESTION_POINTS in scoring.ts and
  -- guarded against drift by src/utils/__tests__/scoring.test.ts.
  v_max_per_call constant integer := 275;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.player_answers
  SET scored = true
  WHERE room_id = p_room_id
    AND user_id = v_uid
    AND question_index = p_question_index
    AND tv_session_id IS NULL
    AND is_correct = true
    AND scored = false
    AND NOT EXISTS (
      SELECT 1 FROM public.room_questions rq
      WHERE rq.room_id = p_room_id
        AND rq.question_index = p_question_index
        AND rq.correct_answer = '__vote__'
    )
  RETURNING id, time_remaining INTO v_claimed_id, v_time_remaining;

  IF v_claimed_id IS NULL THEN
    RETURN; -- nothing to pay, or already paid
  END IF;

  v_award := 100 + round(LEAST(GREATEST(v_time_remaining, 0), 15)) * 10;

  -- The first-correct bonus rides the same claim table submitAnswer races
  -- into client-side; re-checked here rather than trusted, same as the base
  -- award.
  IF EXISTS (
    SELECT 1 FROM public.room_first_correct rfc
    JOIN public.game_rooms gr ON gr.current_game_id = rfc.game_id
    WHERE gr.id = p_room_id
      AND rfc.question_index = p_question_index
      AND rfc.user_id = v_uid
  ) THEN
    v_award := v_award + 25;
  END IF;

  v_award := LEAST(v_award, v_max_per_call);

  UPDATE public.room_participants
  SET score = GREATEST(0, score + v_award)
  WHERE room_id = p_room_id
    AND user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_participant_score(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_participant_score(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_participant_score(uuid, integer) TO authenticated;

-- The observer-bonus flow (MultiplayerObserverScreen, awarded through
-- awardObserverBonus) also called increment_participant_score(room, delta)
-- — a legitimate use the QA finding didn't have in view, but one that would
-- have kept the exact same hole open under the same name: a raw delta with
-- no record behind it, now just relabelled "observer bonus" instead of
-- "answer". increment_participant_score's new signature can no longer serve
-- both calls (a bonus amount is not a question index), so the delta path
-- moves to its own function, carrying forward the same 275 clamp it always
-- had, plus one check the shared name never had room for: only the room's
-- OWN observing host may call it. A participant who is not that room's host,
-- or a host whose room isn't in observer mode, gets no credit at all.
CREATE OR REPLACE FUNCTION public.award_room_observer_bonus(
  p_room_id uuid,
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_per_call constant integer := 275;
  v_delta integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = p_room_id
      AND host_user_id = auth.uid()
      AND host_is_observer = true
  ) THEN
    RETURN; -- not this room's observing host: nothing to award
  END IF;

  v_delta := LEAST(p_delta, v_max_per_call);

  UPDATE public.room_participants
  SET score = GREATEST(0, score + v_delta)
  WHERE room_id = p_room_id
    AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.award_room_observer_bonus(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_room_observer_bonus(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_room_observer_bonus(uuid, integer) TO authenticated;

-- ── 3. Room capacity was enforced client-side only (Finding 3) ─────────────
--
-- enterRoom did a SELECT count(*) and a separate INSERT, with no lock
-- between them. Stress-tested: a max_players=5 room hit with 8 concurrent
-- joins ended up with 7 seats filled, and the two rejected joiners had both
-- just read a stale count moments before their own insert would have
-- landed — a textbook TOCTOU race, and exactly the traffic shape a popular
-- invite link shared into a group chat produces.
--
-- Moved server-side and made atomic: SELECT ... FOR UPDATE takes a row lock
-- on the room first, so every concurrent joiner serializes through this
-- function one at a time, and only THEN is the seat count taken and checked
-- against max_players. "Room is full" is a plain RAISE EXCEPTION the client
-- already knows how to show, not a raw trigger failure.
--
-- Guest joins (InvitePage's accept flow) call supabase.auth.signInAnonymously
-- before ever reaching this — an anonymous Supabase user still carries role
-- authenticated (with an is_anonymous claim), not anon, so no grant to anon
-- is needed here.
CREATE OR REPLACE FUNCTION public.join_classic_room(
  p_room_id uuid,
  p_nickname text,
  p_avatar_url text,
  p_country_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_room public.game_rooms%ROWTYPE;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'room not found';
  END IF;

  -- enterRoom only calls this from its "not already a participant" branch,
  -- but the check-then-call itself isn't locked the same way the seat count
  -- below is — so re-check here rather than trust the caller, and no-op
  -- rather than error: a second call for someone already seated isn't a
  -- capacity problem.
  IF EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = v_uid
  ) THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.room_participants
  WHERE room_id = p_room_id;

  IF v_count >= COALESCE(v_room.max_players, 2) THEN
    RAISE EXCEPTION 'room is full' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.room_participants
    (room_id, user_id, nickname, avatar_url, country_code, is_host)
  VALUES
    (p_room_id, v_uid, COALESCE(NULLIF(p_nickname, ''), 'Player'),
     p_avatar_url, p_country_code, false)
  ON CONFLICT (room_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.join_classic_room(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_classic_room(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_classic_room(uuid, text, text, text) TO authenticated;
