-- Follow-up 1: duplicates the first pass under-merged.
--
-- The clustering keys on shared content words, and this family phrases the same
-- question six different ways — "ten percent of brains", "10% brain use",
-- "all their brain capacity". Too little overlap to merge, so five near-copies
-- survived the first pass. Found by re-running scripts/audit-questions.mjs
-- against production afterwards.
--
-- Kept: df304a6c, which asks it from the other side ("Do humans use all their
-- brain capacity?" -> "Yes, use 100%") and reads better than a fourth "No, myth".
-- Also kept: 1a7ec003, which asks WHO originated the misconception. That is a
-- different question with a different answer, not a duplicate.
--
-- Nothing is deleted. To bring any of these back:
--   UPDATE public.questions SET is_active = true, in_production = true,
--     quality_status = NULL WHERE id = '<id>';

BEGIN;

UPDATE public.questions SET
    is_active = false,
    in_production = false,
    quality_status = 'retired_duplicate',
    updated_at = now()
  WHERE id IN (
    'a41b8401-8c67-4932-bd7f-bb1b7bff457f',  -- "Can humans actually use only ten percent of brains?"
    'b7c7bc18-f244-4c36-8542-39f5d66ba5a2',  -- "Is the "10% brain use" a myth based on scientific evidence?"
    'a777ae00-4696-4670-b92c-07f935796027',  -- "Do humans actually use only ten percent of their brains daily?"
    'e62a7d52-65d7-4b21-ae5f-efac527cf582'   -- "Do humans really use only ten percent of brain capacity?"
  );

COMMIT;
