-- Eight questions that were written twice.
--
-- A sweep for the same (stem, answer) inside one category and one language
-- found twelve collisions across 60,132 active rows. They were not twelve
-- separate mistakes: they are eight English questions authored twice in
-- different words, whose translations then landed on the same sentence.
--
--   "What is the hardest natural mineral?"
--   "What is the hardest naturally occurring mineral?"
--
-- Those are one question. In Spanish and Portuguese they are the same
-- string, which is how the sweep noticed, but a player meets the repeat in
-- English too -- it is the same picture problem in text form.
--
-- One of each pair is retired, wording chosen for the shorter and plainer
-- of the two (and, for the ByteDance pair, the one that fits the card: the
-- other runs past the 65 characters the question card is sized for).
--
-- Retired, not deleted: is_active = false is how this bank takes a question
-- out of play everywhere, and it keeps the row for anything that references
-- it. Its six translations go with it -- half a question in six languages is
-- worse than none.
--
-- The trigger recounts total_levels afterwards, so a category that drops
-- below a ten-question boundary stops advertising the level it can no
-- longer fill. All eight sit in categories with hundreds of questions, so
-- nothing is expected to move.

BEGIN;

WITH retired(id) AS (VALUES
  -- "What year was YouTube first founded as a video platform?"
  --   kept: "In what year was YouTube founded?"
  ('09c201bb-e584-4d29-9023-af46d61eee6b'::uuid),
  -- "Which animal holds the record for longest migration distance?"
  --   kept: "Which animal has the longest migratory route?"
  ('06fc2f4b-ef5d-4aa5-af71-670a5e06371d'::uuid),
  -- '"Loss" meme comic strip originated from which webcomic?'
  --   kept: "Which webcomic is the origin of the 'Loss' internet meme?"
  ('057dc905-59ba-4ca5-9ced-0fe0f8435035'::uuid),
  -- "What is the hardest naturally occurring mineral?"
  --   kept: "What is the hardest natural mineral?"
  ('4a31a649-a4ca-4df5-a5d4-73ba387ded2b'::uuid),
  -- "Who is credited with finding Tutankhamun's tomb in 1922?"
  --   kept: "Who discovered Tutankhamun's tomb in 1922?"
  ('1bd3828a-7360-4c89-a040-d3e26e378fe5'::uuid),
  -- "Who developed the categorical imperative?"
  --   kept: "Which philosopher created the categorical imperative?"
  ('7e7fafcd-2ef9-42a0-b5d3-35c88b156c6c'::uuid),
  -- "Grammy-rescinded duo for not singing on album?"
  --   kept: "Musical duo whose Grammy was revoked for not singing on album?"
  ('87a5379f-b380-4d7b-8631-2a558a871198'::uuid),
  -- "Who is the founder of ByteDance, the parent company that developed TikTok?"
  --   kept: "Which inventor created TikTok's parent company ByteDance?"
  ('6b9e9347-9236-4c64-91dc-e9dd1a73fe3a'::uuid)
)
UPDATE public.questions q
SET is_active = false
WHERE q.id IN (SELECT id FROM retired)
   OR q.translated_from IN (SELECT id FROM retired);

COMMIT;
