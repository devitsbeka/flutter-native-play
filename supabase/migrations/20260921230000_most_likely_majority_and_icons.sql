-- "Most Likely To": majority rules, and every prompt wears an icon.
--
-- 1. Scoring change: a vote question now pays ONLY when a single name tops
--    the tally. A split top vote (a tie) records the tied names in
--    room_vote_results.winners — so every device can show what happened —
--    but pays nobody and marks no answer correct: the room's majority is
--    what makes an answer "right", and a split room has no majority.
--    (Before this, ties paid every side, which let a 1-1 room mint points.)
--
-- 2. The 36 seeded prompts were inserted without icon_slug, so the in-game
--    question card (which renders questions.icon_slug through DynamicIcon)
--    showed nothing on vote rounds. Each prompt family — the en root and
--    its six translations — now carries an icon-library slug verified to
--    exist in the production icon_library table.
--
-- Companion to supabase/migrations/20260916100000_most_likely_to.sql
-- (generated originally by scripts/most-likely-to/build-migration.py, whose
-- prompt ids are uuid5 of the prompt slug — which is how the families are
-- addressed below). Idempotent: plain UPDATEs and CREATE OR REPLACE.

BEGIN;

-- ── per-prompt icons (en root OR its translations, one family at a time) ──

UPDATE public.questions SET icon_slug = 'alarm-clock'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '197a3a14-b938-5689-847e-37975b41925a' OR translated_from = '197a3a14-b938-5689-847e-37975b41925a');  -- wakes-earliest
UPDATE public.questions SET icon_slug = 'moon'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '99466797-0aae-577b-8f96-c31a85691fa9' OR translated_from = '99466797-0aae-577b-8f96-c31a85691fa9');  -- sleeps-latest
UPDATE public.questions SET icon_slug = 'wristwatch'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'b231df74-5aff-5696-8d89-6cf103be8a56' OR translated_from = 'b231df74-5aff-5696-8d89-6cf103be8a56');  -- always-late
UPDATE public.questions SET icon_slug = 'coffee'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'fe01455f-05e8-5765-b3ff-8c027b8fa532' OR translated_from = 'fe01455f-05e8-5765-b3ff-8c027b8fa532');  -- most-coffee
UPDATE public.questions SET icon_slug = 'smartphone'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'f372e4fc-853d-522d-a24d-f09ceb179518' OR translated_from = 'f372e4fc-853d-522d-a24d-f09ceb179518');  -- most-phone-time
UPDATE public.questions SET icon_slug = 'key'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '7ae8f712-559a-53ef-9012-cc2cbcb7d57e' OR translated_from = '7ae8f712-559a-53ef-9012-cc2cbcb7d57e');  -- forgets-keys
UPDATE public.questions SET icon_slug = 'broom'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '5e882763-fc4c-5d6b-be77-ec1b5ac189a0' OR translated_from = '5e882763-fc4c-5d6b-be77-ec1b5ac189a0');  -- tidies-most
UPDATE public.questions SET icon_slug = 'sponge'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '1513f54c-7bc8-547a-acd6-84b5d1851225' OR translated_from = '1513f54c-7bc8-547a-acd6-84b5d1851225');  -- washes-dishes
UPDATE public.questions SET icon_slug = 'soap'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '13d19575-fa9f-5fe7-8ece-b719ab1fa9da' OR translated_from = '13d19575-fa9f-5fe7-8ece-b719ab1fa9da');  -- tidiest-person
UPDATE public.questions SET icon_slug = 'chef'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '1e9cc3b0-1945-530d-b70e-f7cc45d9ff17' OR translated_from = '1e9cc3b0-1945-530d-b70e-f7cc45d9ff17');  -- best-cook
UPDATE public.questions SET icon_slug = 'candy'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '00caa2b6-a51d-5a0c-9fe6-76024f37d77a' OR translated_from = '00caa2b6-a51d-5a0c-9fe6-76024f37d77a');  -- loves-sweets
UPDATE public.questions SET icon_slug = 'snail'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '7cf5ef8c-8789-5d08-a4a1-e307b2b18ff3' OR translated_from = '7cf5ef8c-8789-5d08-a4a1-e307b2b18ff3');  -- eats-slowest
UPDATE public.questions SET icon_slug = 'restaurant'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'c8d02807-ae9c-5988-bc21-a4b270474287' OR translated_from = 'c8d02807-ae9c-5988-bc21-a4b270474287');  -- picks-restaurant
UPDATE public.questions SET icon_slug = 'cake'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'ee541083-b56d-5f68-9f77-374eea548c5c' OR translated_from = 'ee541083-b56d-5f68-9f77-374eea548c5c');  -- best-cake
UPDATE public.questions SET icon_slug = 'dog'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '32e51797-fde5-5526-a02b-a81207e55299' OR translated_from = '32e51797-fde5-5526-a02b-a81207e55299');  -- feeds-pet
UPDATE public.questions SET icon_slug = 'clown'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '248adff4-d239-544f-969f-20d9bb27162e' OR translated_from = '248adff4-d239-544f-969f-20d9bb27162e');  -- makes-laugh
UPDATE public.questions SET icon_slug = 'karaoke-microphone'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '43edda39-7098-5389-bc9e-208f86fe9f18' OR translated_from = '43edda39-7098-5389-bc9e-208f86fe9f18');  -- sings-loudest
UPDATE public.questions SET icon_slug = 'chat'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '2ff7e288-3a86-5a2a-a49e-f53295e92764' OR translated_from = '2ff7e288-3a86-5a2a-a49e-f53295e92764');  -- talks-most
UPDATE public.questions SET icon_slug = 'selfie'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '5ae02788-9b7e-525f-9ef7-00129955dba1' OR translated_from = '5ae02788-9b7e-525f-9ef7-00129955dba1');  -- most-selfies
UPDATE public.questions SET icon_slug = 'tarantula'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'ca2edc1c-a7b3-52e1-ab00-d0f1aad7598d' OR translated_from = 'ca2edc1c-a7b3-52e1-ab00-d0f1aad7598d');  -- fears-spiders
UPDATE public.questions SET icon_slug = 'television'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '64062a79-30c2-53fe-9449-5ca018a8285a' OR translated_from = '64062a79-30c2-53fe-9449-5ca018a8285a');  -- most-tv
UPDATE public.questions SET icon_slug = 'birthday-cake'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'faad53b2-037d-58e2-8b82-fac6ae1fccdb' OR translated_from = 'faad53b2-037d-58e2-8b82-fac6ae1fccdb');  -- remembers-birthdays
UPDATE public.questions SET icon_slug = 'smile'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'aeacb34f-14cd-50b3-8952-438dac25696a' OR translated_from = 'aeacb34f-14cd-50b3-8952-438dac25696a');  -- most-jokes
UPDATE public.questions SET icon_slug = 'magnifying-glass'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '9eee7406-cde8-5057-81ee-42243849bc1d' OR translated_from = '9eee7406-cde8-5057-81ee-42243849bc1d');  -- finds-lost-things
UPDATE public.questions SET icon_slug = 'teddy-bear'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '8c310d39-7e91-5e8e-92af-6332cca605e3' OR translated_from = '8c310d39-7e91-5e8e-92af-6332cca605e3');  -- childhood-stories
UPDATE public.questions SET icon_slug = 'suitcase'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'eb1aa2c8-b547-504a-85a4-1bd8217300d3' OR translated_from = 'eb1aa2c8-b547-504a-85a4-1bd8217300d3');  -- travels-soon
UPDATE public.questions SET icon_slug = 'airplane'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'b0ee23fa-e6e1-5900-acd3-b6859eef7f3a' OR translated_from = 'b0ee23fa-e6e1-5900-acd3-b6859eef7f3a');  -- loves-flying
UPDATE public.questions SET icon_slug = 'beach'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '2b1731dd-7c42-56c3-9a1f-4ae6a5a84119' OR translated_from = '2b1731dd-7c42-56c3-9a1f-4ae6a5a84119');  -- wants-seaside
UPDATE public.questions SET icon_slug = 'radio'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '1ffe162c-362e-54f9-9df4-b59bc7e13fcc' OR translated_from = '1ffe162c-362e-54f9-9df4-b59bc7e13fcc');  -- picks-car-music
UPDATE public.questions SET icon_slug = 'rainbow'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '80d0ce4a-32d4-5cfe-87b8-5a6ba7b0c15a' OR translated_from = '80d0ce4a-32d4-5cfe-87b8-5a6ba7b0c15a');  -- loves-bright-colours
UPDATE public.questions SET icon_slug = 'movie'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '600b5a8f-89f1-5146-a77b-339c55fc9477' OR translated_from = '600b5a8f-89f1-5146-a77b-339c55fc9477');  -- most-films
UPDATE public.questions SET icon_slug = 'snowman'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '6720f311-904d-5a21-a4eb-c705fec8bdfd' OR translated_from = '6720f311-904d-5a21-a4eb-c705fec8bdfd');  -- loves-winter
UPDATE public.questions SET icon_slug = 'soccer-ball'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = 'e66fe194-815b-5b42-913e-27681db82ddf' OR translated_from = 'e66fe194-815b-5b42-913e-27681db82ddf');  -- loves-football
UPDATE public.questions SET icon_slug = 'gift'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '6608de8c-4a82-5c7b-8eab-8d722903a3cc' OR translated_from = '6608de8c-4a82-5c7b-8eab-8d722903a3cc');  -- best-presents
UPDATE public.questions SET icon_slug = 'camera'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '7680b5b1-f94d-5ee3-981d-5b18e873d605' OR translated_from = '7680b5b1-f94d-5ee3-981d-5b18e873d605');  -- dinner-photos
UPDATE public.questions SET icon_slug = 'umbrella'
  WHERE category_id = 'b7cdb122-2175-5434-9f5f-756cf7e215c8'
    AND (id = '325588ab-b48b-52a3-b647-3c0f66e72733' OR translated_from = '325588ab-b48b-52a3-b647-3c0f66e72733');  -- forgets-umbrella

-- ── majority-only settlement ───────────────────────────────────────────────
--
-- Settle the vote for one question (p_question_index set) or for every
-- still-unsettled question of the game (p_question_index NULL — the results
-- screen's catch-all sweep).
--
-- For each question: tally player_answers (empty answers are timeouts and
-- don't count) and record the top name(s) and counts in room_vote_results.
-- The payout happens ONLY when exactly one name tops the tally: its voters
-- get a flat 100 and their answers are marked correct. A tied top vote is
-- recorded (winners holds the tied names) but pays nobody — no majority, no
-- correct answer. Scores land in room_participants.score exactly like live
-- play, so complete_room_round's totals pick them up unchanged.
--
-- Only questions whose room_questions row carries the '__vote__' sentinel are
-- ever settled, so this function cannot mint points on a normal trivia round.
CREATE OR REPLACE FUNCTION public.settle_most_likely_votes(
  p_room_id uuid,
  p_game_id uuid,
  p_question_index integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_idx integer;
  v_winners text[];
  v_counts jsonb;
  v_claimed integer;
  v_settled integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant of this room';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_games
    WHERE id = p_game_id AND room_id = p_room_id
  ) THEN
    RAISE EXCEPTION 'game does not belong to this room';
  END IF;

  FOR v_idx IN
    SELECT rq.question_index
    FROM public.room_questions rq
    WHERE rq.game_id = p_game_id
      AND rq.room_id = p_room_id
      AND rq.correct_answer = '__vote__'
      AND (p_question_index IS NULL OR rq.question_index = p_question_index)
    ORDER BY rq.question_index
  LOOP
    -- The tally. player_answers rows are wiped at every round start, so
    -- (room_id, question_index) only ever holds the current round's votes.
    SELECT COALESCE(array_agg(answer ORDER BY answer), '{}')
    INTO v_winners
    FROM (
      SELECT answer, count(*) AS votes
      FROM public.player_answers
      WHERE room_id = p_room_id
        AND question_index = v_idx
        AND answer <> ''
      GROUP BY answer
    ) tallied
    WHERE votes = (
      SELECT max(votes) FROM (
        SELECT count(*) AS votes
        FROM public.player_answers
        WHERE room_id = p_room_id
          AND question_index = v_idx
          AND answer <> ''
        GROUP BY answer
      ) m
    );

    SELECT COALESCE(jsonb_object_agg(answer, votes), '{}'::jsonb)
    INTO v_counts
    FROM (
      SELECT answer, count(*) AS votes
      FROM public.player_answers
      WHERE room_id = p_room_id
        AND question_index = v_idx
        AND answer <> ''
      GROUP BY answer
    ) c;

    -- The claim. Exactly one caller inserts the row; the payout below rides
    -- in the same transaction, so a question settles exactly once or not at
    -- all.
    INSERT INTO public.room_vote_results (game_id, question_index, room_id, winners, vote_counts)
    VALUES (p_game_id, v_idx, p_room_id, v_winners, v_counts)
    ON CONFLICT (game_id, question_index) DO NOTHING
    RETURNING 1 INTO v_claimed;

    IF v_claimed IS NULL THEN
      CONTINUE;
    END IF;

    v_settled := v_settled + 1;

    -- Majority only: a single top name pays its voters; a tied top vote is
    -- recorded above but pays nobody — no majority, no correct answer.
    IF array_length(v_winners, 1) IS DISTINCT FROM 1 THEN
      CONTINUE;
    END IF;

    UPDATE public.player_answers
    SET is_correct = true,
        points_earned = 100
    WHERE room_id = p_room_id
      AND question_index = v_idx
      AND answer = ANY(v_winners);

    UPDATE public.room_participants rp
    SET score = COALESCE(rp.score, 0) + 100
    FROM public.player_answers pa
    WHERE pa.room_id = p_room_id
      AND pa.question_index = v_idx
      AND pa.answer = ANY(v_winners)
      AND rp.room_id = p_room_id
      AND rp.user_id = pa.user_id;
  END LOOP;

  RETURN v_settled;
END;
$fn$;

-- CREATE OR REPLACE keeps the existing ACL, but restate it anyway so this
-- file stands alone (AGENTS.md rule 3): bootstrap grants SECURITY DEFINER
-- functions to PUBLIC and anon — close both, then grant exactly who may call.
REVOKE ALL ON FUNCTION public.settle_most_likely_votes(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_most_likely_votes(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_most_likely_votes(uuid, uuid, integer) TO authenticated;

COMMIT;
