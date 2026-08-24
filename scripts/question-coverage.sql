-- =====================================================================
--  Question coverage across the seven languages — ONE query, one result
-- =====================================================================
--
--  Written as a single SELECT on purpose. Lovable's editor returns only
--  the LAST result set of a multi-statement script, so the earlier
--  version's four queries meant only the last one was ever visible: two
--  exports of it came back byte-identical, both the Georgian ranking,
--  with the language totals and the active/inactive split — the numbers
--  the run was for — discarded before they reached the screen.
--
--  Everything is in one result now, ordered so it reads top to bottom:
--
--    00-04   summary rows, one metric per row, seven language columns
--    10      one row per shared category, with the Georgian delta
--    20      one row per language-specific category (georgian_*,
--            french_*, ...) where the zeros are the design, not a gap
--
--  READ THIS FIRST — what SQL can and cannot fill.
--
--  The bank is not seven parallel banks. English is the source, and a
--  pg_cron job (translate-questions) turns each English production
--  question into de/es/fr/it/pt with an AI call, writing the result back
--  with translated_from pointing at the English row.
--
--      TARGETS = de, es, fr, it, pt          -- ka is NOT a target
--      sources = language='en' AND in_production AND is_active
--                AND translated_from IS NULL
--
--  So "fill in the missing questions" is three different jobs and only
--  one of them is SQL:
--
--    de/es/fr/it/pt   Fed automatically. Compare the SOURCES row to each
--                     language's TRANSLATED row: if they match there is
--                     no backlog and nothing for an INSERT to do.
--
--    BLOCKED          English questions held at in_production=false are
--                     invisible to the pipeline, so no language ever
--                     receives them. This IS a SQL fix — the UPDATE at
--                     the bottom — and each one promoted yields five
--                     real translations, written by the pipeline.
--
--    ka               Neither source nor target. Uneven in both
--                     directions, and only authoring or a TARGETS change
--                     closes it.
--
--  What this script will not do is insert rows to level the numbers. A
--  row with language='ka' and English text counts as coverage and plays
--  as a broken question.
--
--  One caveat on any figure measured from outside this editor: questions
--  carries
--
--      CREATE POLICY "Anyone can view active questions" ... USING (
--        is_active = true OR has_role(auth.uid(), 'admin') )
--
--  so the app's publishable key cannot see is_active = false at all.
--  Counts taken through it are the active subset — Georgian video_games
--  reads 53 that way and is 80 here. This editor sees everything; that
--  is why the ACTIVE and INACTIVE rows are worth reading.
-- =====================================================================

WITH q AS (
    SELECT
        c.category_id,
        c.name,
        COALESCE(c.is_language_specific, false) AS lang_specific,
        qq.language,
        COALESCE(qq.is_active, false)           AS is_active,
        COALESCE(qq.in_production, false)       AS in_production,
        qq.translated_from
      FROM public.questions  qq
      JOIN public.categories c ON c.id = qq.category_id
),
per_cat AS (
    SELECT
        category_id,
        name,
        lang_specific,
        count(*) FILTER (WHERE language = 'ka') AS ka,
        count(*) FILTER (WHERE language = 'en') AS en,
        count(*) FILTER (WHERE language = 'de') AS de,
        count(*) FILTER (WHERE language = 'es') AS es,
        count(*) FILTER (WHERE language = 'fr') AS fr,
        count(*) FILTER (WHERE language = 'it') AS it,
        count(*) FILTER (WHERE language = 'pt') AS pt,
        count(*)                                AS total
      FROM q
     GROUP BY category_id, name, lang_specific
),
summary AS (
    SELECT 0 AS ord, 'ALL QUESTIONS' AS metric,
           count(*) FILTER (WHERE language='ka') ka, count(*) FILTER (WHERE language='en') en,
           count(*) FILTER (WHERE language='de') de, count(*) FILTER (WHERE language='es') es,
           count(*) FILTER (WHERE language='fr') fr, count(*) FILTER (WHERE language='it') it,
           count(*) FILTER (WHERE language='pt') pt, count(*) total
      FROM q
    UNION ALL
    SELECT 1, 'ACTIVE',
           count(*) FILTER (WHERE language='ka'), count(*) FILTER (WHERE language='en'),
           count(*) FILTER (WHERE language='de'), count(*) FILTER (WHERE language='es'),
           count(*) FILTER (WHERE language='fr'), count(*) FILTER (WHERE language='it'),
           count(*) FILTER (WHERE language='pt'), count(*)
      FROM q WHERE is_active
    UNION ALL
    SELECT 2, 'INACTIVE (hidden from the app key)',
           count(*) FILTER (WHERE language='ka'), count(*) FILTER (WHERE language='en'),
           count(*) FILTER (WHERE language='de'), count(*) FILTER (WHERE language='es'),
           count(*) FILTER (WHERE language='fr'), count(*) FILTER (WHERE language='it'),
           count(*) FILTER (WHERE language='pt'), count(*)
      FROM q WHERE NOT is_active
    UNION ALL
    -- What the cron reads from, and what it has already written. These two
    -- rows are the backlog: SOURCES in the en column against TRANSLATED in
    -- each target column.
    SELECT 3, 'PIPELINE SOURCES (english)',
           0, count(*), 0, 0, 0, 0, 0, count(*)
      FROM q WHERE language='en' AND in_production AND is_active AND translated_from IS NULL
    UNION ALL
    SELECT 4, 'TRANSLATED ROWS',
           count(*) FILTER (WHERE language='ka'), count(*) FILTER (WHERE language='en'),
           count(*) FILTER (WHERE language='de'), count(*) FILTER (WHERE language='es'),
           count(*) FILTER (WHERE language='fr'), count(*) FILTER (WHERE language='it'),
           count(*) FILTER (WHERE language='pt'), count(*)
      FROM q WHERE translated_from IS NOT NULL
    UNION ALL
    -- Multiply this by 5 for what the UPDATE at the bottom is worth.
    SELECT 5, 'BLOCKED: english, active, not in production',
           0, count(*), 0, 0, 0, 0, 0, count(*)
      FROM q WHERE language='en' AND NOT in_production AND is_active AND translated_from IS NULL
)
SELECT
    to_char(ord, 'FM00')                       AS sort,
    metric                                     AS category,
    NULL::text                                 AS name,
    ka, en, de, es, fr, it, pt, total,
    NULL::numeric                              AS ka_delta
  FROM summary

UNION ALL

SELECT
    '10',
    category_id,
    name,
    ka, en, de, es, fr, it, pt, total,
    ka - round((en + de + es + fr + it + pt) / 6.0) AS ka_delta
  FROM per_cat
 WHERE NOT lang_specific

UNION ALL

SELECT
    '20',
    category_id,
    name,
    ka, en, de, es, fr, it, pt, total,
    NULL
  FROM per_cat
 WHERE lang_specific

 ORDER BY 1, 12 NULLS LAST, 2;


-- =====================================================================
--  THE ONLY WRITE — run separately, after reading the BLOCKED row above.
--
--  English questions that are active but held out of production are
--  invisible to get_untranslated_questions, so no language ever receives
--  them. Promoting them hands the pipeline that many new sources and the
--  cron writes five genuine translations for each, on its own.
--
--  Read them before publishing them — the schema records that they were
--  held back, never why:
--
--    SELECT c.category_id, q.question_text, q.correct_answer
--      FROM public.questions q
--      JOIN public.categories c ON c.id = q.category_id
--     WHERE q.language = 'en' AND q.in_production = false AND q.is_active
--     ORDER BY c.category_id;
--
--  Reversible: set in_production = false for the same ids. Translations
--  already written would need deleting separately
--  (DELETE FROM questions WHERE translated_from IN (those ids)).
-- =====================================================================

-- UPDATE public.questions
--    SET in_production = true,
--        updated_at    = now()
--  WHERE language      = 'en'
--    AND in_production = false
--    AND is_active     = true
--    AND translated_from IS NULL;
