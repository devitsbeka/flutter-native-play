-- =====================================================================
--  Question coverage across the seven languages
--  Run in Lovable's SQL editor. Sections 1-3 only read; section 4 writes
--  and is the only thing here that changes anything.
-- =====================================================================
--
--  READ THIS FIRST — what SQL can and cannot fill.
--
--  The bank is not seven parallel banks. English is the source, and a
--  pg_cron job (the translate-questions edge function) turns each English
--  production question into de/es/fr/it/pt with an AI call, writing the
--  result back with translated_from pointing at the English row.
--
--      TARGETS = de, es, fr, it, pt          -- ka is NOT a target
--      sources = language='en' AND in_production AND is_active
--                AND translated_from IS NULL
--
--  So "fill in the missing questions" splits into three different jobs,
--  and only one of them is SQL:
--
--    de/es/fr/it/pt   Already complete. 8,696 English sources, and
--                     8,696 translated rows in every one of the five.
--                     Zero backlog. Nothing is missing and there is
--                     nothing for an INSERT to do.
--
--    the blocked      English questions sitting at in_production=false are
--    English          invisible to the pipeline, so no language ever gets
--                     them. This IS a SQL fix — section 4 — and each one
--                     promoted yields five real translations, written by
--                     the pipeline rather than by this script. Section 1b
--                     counts them; run it before section 4.
--
--  A correction, and the reason section 1b exists. The first numbers I
--  put on this were measured through the app's publishable key, and
--  questions carries
--
--      CREATE POLICY "Anyone can view active questions" ... USING (
--        is_active = true OR has_role(auth.uid(), 'admin') )
--
--  so every count I took silently excluded is_active = false, and I
--  reported "inactive: 0" when what I had actually measured was "zero
--  inactive rows are visible to me". Georgian video_games read 53 through
--  that key and is 80 in the table. Anything this script prints from
--  Lovable's privileged session is the real number; anything measured
--  from outside is the active subset.
--
--    ka               No pipeline at all: Georgian is neither source nor
--                     target. Its shared-category coverage is uneven in
--                     both directions (video_games 53 against 269
--                     elsewhere; geography 364 against 177). Closing that
--                     means authoring Georgian questions or adding 'ka'
--                     to TARGETS in the edge function — see section 5.
--
--  What this script deliberately does NOT do is insert question rows to
--  make the numbers match. A row inserted with language='ka' and English
--  text counts as coverage and plays as a broken question; the count is
--  not the thing worth fixing.
--
-- =====================================================================


-- ---------------------------------------------------------------------
--  1. Where each language stands
-- ---------------------------------------------------------------------
SELECT
    q.language,
    count(*)                                        AS questions,
    count(*) FILTER (WHERE q.in_production)          AS in_production,
    count(*) FILTER (WHERE q.translated_from IS NOT NULL) AS machine_translated,
    count(DISTINCT q.category_id)                    AS categories
  FROM public.questions q
 GROUP BY q.language
 ORDER BY questions DESC;


-- ---------------------------------------------------------------------
--  1b. Active vs inactive, and what the pipeline can actually reach.
--
--      Only this privileged session can see is_active = false at all, so
--      this is the section that says whether the bank is smaller than it
--      looks and how much section 4 is really worth.
--
--      pipeline_sources is exactly what get_untranslated_questions
--      selects from; blocked_by_production is what section 4 unblocks
--      (multiply by 5 for the translations that follow).
-- ---------------------------------------------------------------------
SELECT
    q.language,
    count(*)                                                             AS total,
    count(*) FILTER (WHERE q.is_active)                                  AS active,
    count(*) FILTER (WHERE NOT q.is_active OR q.is_active IS NULL)       AS inactive,
    count(*) FILTER (WHERE q.language = 'en' AND q.in_production
                       AND q.is_active AND q.translated_from IS NULL)    AS pipeline_sources,
    count(*) FILTER (WHERE q.language = 'en' AND NOT q.in_production
                       AND q.is_active AND q.translated_from IS NULL)    AS blocked_by_production
  FROM public.questions q
 GROUP BY q.language
 ORDER BY total DESC;


-- ---------------------------------------------------------------------
--  2. The matrix: every category, every language
--     Language-specific categories (georgian_*, french_*, ...) are
--     flagged, because their zeros are the design and not a gap.
-- ---------------------------------------------------------------------
SELECT
    c.category_id,
    c.name,
    c.is_language_specific                                        AS lang_specific,
    count(*) FILTER (WHERE q.language = 'ka') AS ka,
    count(*) FILTER (WHERE q.language = 'en') AS en,
    count(*) FILTER (WHERE q.language = 'de') AS de,
    count(*) FILTER (WHERE q.language = 'es') AS es,
    count(*) FILTER (WHERE q.language = 'fr') AS fr,
    count(*) FILTER (WHERE q.language = 'it') AS it,
    count(*) FILTER (WHERE q.language = 'pt') AS pt,
    count(*)                                                      AS total
  FROM public.categories c
  JOIN public.questions  q ON q.category_id = c.id
 GROUP BY c.category_id, c.name, c.is_language_specific
 ORDER BY c.is_language_specific, total DESC;


-- ---------------------------------------------------------------------
--  3. Georgian against the other six, shared categories only.
--     Sorted worst-first: this is the list worth authoring against.
-- ---------------------------------------------------------------------
WITH counts AS (
    SELECT c.category_id, c.name, q.language, count(*) AS n
      FROM public.categories c
      JOIN public.questions  q ON q.category_id = c.id
     WHERE COALESCE(c.is_language_specific, false) = false
     GROUP BY c.category_id, c.name, q.language
)
SELECT
    category_id,
    name,
    COALESCE(max(n) FILTER (WHERE language = 'ka'), 0)              AS ka,
    round(avg(n) FILTER (WHERE language <> 'ka'))                   AS others_avg,
    COALESCE(max(n) FILTER (WHERE language = 'ka'), 0)
      - round(avg(n) FILTER (WHERE language <> 'ka'))               AS georgian_delta
  FROM counts
 GROUP BY category_id, name
 ORDER BY georgian_delta ASC;


-- ---------------------------------------------------------------------
--  4. THE ONLY WRITE.
--
--     153 English questions are active but not in production, so
--     get_untranslated_questions never returns them and none of the five
--     target languages will ever receive them. Promoting them hands the
--     pipeline 153 new sources; the cron then writes 765 genuine
--     translations over the following runs, on its own.
--
--     Look before you leap — run this first to read what you are about
--     to publish:
--
--       SELECT c.category_id, q.question_text, q.correct_answer
--         FROM public.questions q
--         JOIN public.categories c ON c.id = q.category_id
--        WHERE q.language = 'en' AND q.in_production = false
--        ORDER BY c.category_id;
--
--     These are unreviewed drafts, not rejects, as far as the schema
--     knows — but the schema does not record why a question was held
--     back. If any were held back deliberately, publishing them
--     publishes them in six languages.
--
--     Reversible: UPDATE ... SET in_production = false for the same ids.
--     Already-written translations would then need deleting separately
--     (DELETE FROM questions WHERE translated_from IN (those ids)).
-- ---------------------------------------------------------------------

-- UNCOMMENT TO RUN:
--
-- UPDATE public.questions
--    SET in_production = true,
--        updated_at    = now()
--  WHERE language      = 'en'
--    AND in_production = false
--    AND is_active     = true
--    AND translated_from IS NULL;


-- ---------------------------------------------------------------------
--  5. Georgian, if you want the pipeline to cover it too
--
--     Not SQL. 'ka' has to join TARGETS in
--     supabase/functions/translate-questions/index.ts, and the function
--     redeployed through Lovable. Two things to weigh first:
--
--       - Georgian already has 1,097 machine-translated rows, so there
--         is precedent, but the bulk of its bank is authored and reads
--         like it. Machine Georgian sits next to that.
--
--       - The pipeline's only duplicate check is "has THIS source id
--         been translated into this language". It cannot tell that an
--         authored Georgian question already covers the same fact, so
--         translating all 8,696 English sources into Georgian would
--         produce near-duplicates of Georgian content that already
--         exists — heaviest in the categories where Georgian is already
--         ahead (geography, religion_mythology, philosophy, sports).
--
--     The cleaner shape, if you want it: add 'ka' to TARGETS and let it
--     run only over the categories where Georgian is behind, by
--     narrowing get_untranslated_questions with a category allowlist.
-- ---------------------------------------------------------------------
