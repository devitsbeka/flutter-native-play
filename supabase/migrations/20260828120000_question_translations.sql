-- Translations of the English question bank, tracked by lineage.
--
-- The app has seven UI languages but only Georgian and English question
-- pools; a player whose app is German asks for language='de' and gets an
-- empty game (questionService deliberately does not fall back). The
-- translate-questions edge function fills the five missing pools
-- (de/es/fr/it/pt) by translating the production English bank one language
-- at a time, category by category.
--
-- translated_from is what makes the whole pipeline resumable and idempotent:
-- a translated row points at its English source, and the unique index
-- guarantees at most one translation per (source, language) no matter how
-- often a cron batch retries. Original rows keep translated_from NULL, and
-- NULLs are distinct in a unique index, so they are unaffected.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS translated_from uuid REFERENCES public.questions(id) ON DELETE CASCADE;

-- Deliberately not partial: ON CONFLICT (translated_from, language) — which
-- the edge function's upsert generates — only matches a non-partial index.
CREATE UNIQUE INDEX IF NOT EXISTS questions_translation_unique
  ON public.questions (translated_from, language);

CREATE INDEX IF NOT EXISTS questions_language_category_idx
  ON public.questions (language, category_id);

-- The next batch of English production questions still missing a translation
-- in one language. Ordered by category so each category becomes fully
-- playable before the next one starts, rather than every category being 10%
-- done for a day.
CREATE OR REPLACE FUNCTION public.get_untranslated_questions(p_language text, p_limit integer)
RETURNS SETOF public.questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.*
    FROM public.questions q
   WHERE q.language = 'en'
     AND q.in_production
     AND q.is_active
     AND q.translated_from IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.questions t
        WHERE t.translated_from = q.id AND t.language = p_language
     )
   ORDER BY q.category_id, q.level_number, q.created_at
   LIMIT p_limit;
$$;

-- Coverage per target language, next to the size of the source bank.
CREATE OR REPLACE FUNCTION public.question_translation_progress()
RETURNS TABLE (language text, translated bigint, source_total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH src AS (
    SELECT count(*) AS n FROM public.questions
     WHERE language = 'en' AND in_production AND is_active AND translated_from IS NULL
  )
  SELECT t.language, count(*) AS translated, src.n AS source_total
    FROM public.questions t, src
   WHERE t.translated_from IS NOT NULL
   GROUP BY t.language, src.n
   ORDER BY t.language;
$$;

-- A new SECURITY DEFINER function is granted to PUBLIC by default — always
-- revoke first, then grant exactly who may call it (CLAUDE.md rule 3).
-- The batch picker returns unfiltered question rows and belongs to the
-- pipeline alone; progress is harmless and useful to signed-in admins.
REVOKE ALL ON FUNCTION public.get_untranslated_questions(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_untranslated_questions(text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.question_translation_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.question_translation_progress() TO authenticated, service_role;
