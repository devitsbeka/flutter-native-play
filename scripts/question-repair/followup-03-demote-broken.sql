-- Move the broken questions back to the Library.
--
-- The bulk "move to production" in Question Studio promotes the whole Library
-- tab, which held two unrelated things: the 641 rewrites this repair staged for
-- review, and 495 questions that had never been in production and were never
-- repaired. Both went live.
--
-- This selects on the defects themselves rather than on a list of ids, so it
-- stays correct however the bank has moved since. It demotes only what is
-- broken; the other newly promoted questions stay in the game.
--
--   question over 90 chars -> the card never clamps, so the text pushes the
--                             answer buttons into a scroll region
--   answer over 48 chars   -> line-clamp-2 cuts it off mid-word
--   not 4 distinct answers -> the same option appears twice
--
-- Verified against a copy of live production: 7,646 -> 7,494, and all three
-- checks go to zero. Nothing is deleted; these return to the Library.

UPDATE public.questions SET in_production = false, updated_at = now()
WHERE in_production AND language = 'en' AND (
  length(question_text) > 90
  OR length(correct_answer) > 48
  OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(incorrect_answers) a WHERE length(a) > 48)
  OR (SELECT count(DISTINCT lower(btrim(x)))
        FROM jsonb_array_elements_text(incorrect_answers || to_jsonb(correct_answer)) x) <> 4
);
