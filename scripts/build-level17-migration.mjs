#!/usr/bin/env node
/**
 * Emit the migration that takes the eight short categories to 17 levels.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT A PILE OF NEW QUESTIONS
 * ----------------------------------------------------------
 * Eight categories advertised fewer than 17 levels. The obvious reading is
 * "the bank is thin there", and it is wrong: in six of the eight, Georgian is
 * roughly twice the size of every other language, and the six non-Georgian
 * languages have *identical* counts to each other. That is not a content
 * shortage, it is a translation gap with a very specific shape.
 *
 *   myths_reality   ka 258   en/de/es/fr/it/pt 137 each
 *   anime_manga     ka 281   en/de/es/fr/it/pt 156 each
 *
 * translate-questions fans the ENGLISH bank out to six targets, and
 * get_untranslated_questions picks sources with `language = 'en' AND
 * translated_from IS NULL`. A question authored in Georgian is therefore
 * invisible to it forever — there are 936 such rows across these six
 * categories, none of which any language but Georgian has ever seen. Since
 * total_levels is set from the THINNEST language, those 936 rows raise
 * nobody's level count, including Georgian's.
 *
 * So the fix is to translate what is already there rather than invent more:
 * the content has been reviewed, it carries its icons and its difficulty, and
 * it keeps the seven pools telling the same jokes. 67 Georgian sources × 6
 * languages = 402 rows, which is exactly the shortfall.
 *
 * The two literature categories are different — they are
 * `is_language_specific`, serve one language each, and have no other pool to
 * translate from. Those five questions are written, in scripts/level17-
 * translations/literature.mjs.
 *
 * LINEAGE
 * -------
 * Every translated row points at its Georgian source through
 * translated_from, which is what the unique index on
 * (translated_from, language) uses to make this re-runnable. Pointing the
 * English row at the Georgian source rather than the other way round is
 * deliberate: get_untranslated_questions ignores English rows whose
 * translated_from is set, so the pipeline will not later pick these up and
 * translate them BACK into Georgian as duplicates.
 *
 *   node scripts/build-level17-migration.mjs > supabase/migrations/<name>.sql
 */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "level17-translations");
const LANGS = ["en", "de", "es", "fr", "it", "pt"];
const TARGET = 170; // 17 levels × 10 questions per level

/** Postgres string literal. */
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
/** A jsonb array of strings. */
const jsonb = (arr) => `${lit(JSON.stringify(arr))}::jsonb`;

const files = readdirSync(DIR).filter((f) => f.endsWith(".mjs") && f !== "literature.mjs");
const translations = {};
/** slug -> source ids, so the fixture can seed the right category. */
const sourcesByCategory = {};
for (const f of files.sort()) {
  // myths_reality_a.mjs and myths_reality_b.mjs are one category in two files.
  const slug = f.replace(/\.mjs$/, "").replace(/_[ab]$/, "");
  const mod = (await import(join(DIR, f))).default;
  for (const [id, byLang] of Object.entries(mod)) {
    if (translations[id]) throw new Error(`duplicate source id ${id} (${f})`);
    translations[id] = byLang;
    (sourcesByCategory[slug] ??= []).push(id);
  }
}
const literature = (await import(join(DIR, "literature.mjs"))).default;

// --- sanity, before a line of SQL is written ------------------------------
for (const [id, byLang] of Object.entries(translations)) {
  for (const lang of LANGS) {
    const t = byLang[lang];
    if (!t) throw new Error(`${id}: missing ${lang}`);
    if (!t.q?.trim() || !t.c?.trim()) throw new Error(`${id}/${lang}: empty question or answer`);
    if (!Array.isArray(t.w) || t.w.length !== 3) throw new Error(`${id}/${lang}: needs exactly 3 wrong answers`);
    // A translation that collapses the right answer into a wrong one makes
    // the question unanswerable — the same check translate-questions runs.
    const dupe = t.w.find((x) => x.trim().toLowerCase() === t.c.trim().toLowerCase());
    if (dupe) throw new Error(`${id}/${lang}: "${dupe}" is both right and wrong`);
    if (new Set(t.w.map((x) => x.trim().toLowerCase())).size !== 3) {
      throw new Error(`${id}/${lang}: repeated wrong answer`);
    }
  }
}

const out = [];
const p = (s = "") => out.push(s);

const nSources = Object.keys(translations).length;
const nWritten = Object.values(literature).flat().length;

// `--fixture <path-to-migration>` emits the harness instead: a scratch
// Postgres is seeded with exactly the rows the real database holds today,
// the migration is applied to it twice, and the result is asserted. See the
// bottom of this file.
const fixtureFor = process.argv[2] === "--fixture" ? process.argv[3] : null;
if (fixtureFor) {
  process.stdout.write(buildFixture(fixtureFor));
  process.exit(0);
}

p(`-- Eight categories to 17 levels, by translating the Georgian tail.`);
p(`--`);
p(`-- Generated by scripts/build-level17-migration.mjs — edit the translation`);
p(`-- files under scripts/level17-translations/ and regenerate, rather than`);
p(`-- editing this file by hand.`);
p(`--`);
p(`-- ${nSources} Georgian source questions, fanned out to ${LANGS.join(", ")} (${nSources * LANGS.length} rows),`);
p(`-- plus ${nWritten} written for the two language-specific literature categories.`);
p(`--`);
p(`-- Re-runnable: the translated rows collide on the unique index over`);
p(`-- (translated_from, language) and the written ones on their own text.`);
p();
p(`BEGIN;`);
p();

// --- the translated rows --------------------------------------------------
// category_id, difficulty, level_number, icon_slug and image_url are read
// from the Georgian source row rather than repeated here: a hardcoded copy is
// a second source of truth that can only ever drift.
for (const [sourceId, byLang] of Object.entries(translations)) {
  const values = LANGS.map((l) => {
    const t = byLang[l];
    return `    (${lit(l)}, ${lit(t.q)}, ${lit(t.c)}, ${jsonb(t.w)})`;
  }).join(",\n");

  p(`INSERT INTO public.questions (`);
  p(`  category_id, language, question_text, correct_answer, incorrect_answers,`);
  p(`  difficulty, level_number, icon_slug, image_url, is_active, in_production, translated_from`);
  p(`)`);
  p(`SELECT src.category_id, t.language, t.question_text, t.correct_answer, t.incorrect_answers,`);
  p(`       src.difficulty, src.level_number, src.icon_slug, src.image_url, true, true, src.id`);
  p(`  FROM public.questions src`);
  p(`  CROSS JOIN (VALUES`);
  p(values);
  p(`  ) AS t(language, question_text, correct_answer, incorrect_answers)`);
  p(` WHERE src.id = ${lit(sourceId)}::uuid`);
  p(`ON CONFLICT (translated_from, language) DO NOTHING;`);
  p();
}

// --- the written literature rows -----------------------------------------
for (const [slug, rows] of Object.entries(literature)) {
  for (const r of rows) {
    p(`INSERT INTO public.questions (`);
    p(`  category_id, language, question_text, correct_answer, incorrect_answers,`);
    p(`  difficulty, level_number, is_active, in_production`);
    p(`)`);
    p(`SELECT c.id, ${lit(r.language)}, ${lit(r.q)}, ${lit(r.c)}, ${jsonb(r.w)},`);
    p(`       ${lit(r.difficulty)}, ${r.level}, true, true`);
    p(`  FROM public.categories c`);
    p(` WHERE c.category_id = ${lit(slug)}`);
    p(`   AND NOT EXISTS (`);
    p(`     SELECT 1 FROM public.questions q`);
    p(`      WHERE q.category_id = c.id AND q.language = ${lit(r.language)}`);
    p(`        AND q.question_text = ${lit(r.q)}`);
    p(`   );`);
    p();
  }
}

// --- recount --------------------------------------------------------------
// total_levels is maintained by a trigger, but a trigger only fires for the
// rows it sees; recomputing every affected category here means the number the
// player is shown cannot lag the questions behind it.
const slugs = [...new Set([
  ...Object.keys(literature),
  "myths_reality", "anime_manga", "fun_facts", "science", "psychology", "ecology",
])];

p(`-- No recount here on purpose. trigger_update_category_levels fires AFTER`);
p(`-- INSERT FOR EACH ROW on questions and already recomputes total_levels`);
p(`-- with the thinnest-language rule. A second copy of that arithmetic in a`);
p(`-- migration is how the recount and the trigger drifted apart once before`);
p(`-- (see 20260909100000_language_specific_levels.sql).`);
p();

// --- assertion ------------------------------------------------------------
// A silent no-op is the failure mode worth guarding against: if a source row
// has been deleted or renumbered, the INSERT above matches nothing and says
// so with a cheerful "INSERT 0 0". This makes the transaction refuse instead.
p(`-- Refuse to commit a run that did not actually reach 17 levels. A source`);
p(`-- row that has since been deleted would otherwise make the INSERT above a`);
p(`-- silent no-op reported as success.`);
p(`DO $$`);
p(`DECLARE short text;`);
p(`BEGIN`);
p(`  SELECT string_agg(format('%s/%s=%s', category_id, lang, n), ', ' ORDER BY category_id, lang)`);
p(`    INTO short`);
p(`    FROM (`);
p(`      SELECT c.category_id, l.lang, count(q.id) AS n`);
p(`        FROM public.categories c`);
p(`        CROSS JOIN LATERAL unnest(CASE WHEN c.is_language_specific`);
p(`                                       THEN ARRAY[c.language]`);
p(`                                       ELSE ARRAY['ka','en','de','es','fr','it','pt']`);
p(`                                  END) AS l(lang)`);
p(`        LEFT JOIN public.questions q`);
p(`          ON q.category_id = c.id AND q.language = l.lang`);
p(`         AND q.is_active AND q.in_production`);
p(`       WHERE c.category_id IN (${slugs.map(lit).join(", ")})`);
p(`       GROUP BY c.category_id, l.lang`);
p(`      HAVING count(q.id) < ${TARGET}`);
p(`    ) AS gaps;`);
p(`  IF short IS NOT NULL THEN`);
p(`    RAISE EXCEPTION 'still short of ${TARGET} questions: %', short;`);
p(`  END IF;`);
p();
p(`  -- And the number the player is actually shown, which comes from the`);
p(`  -- trigger rather than from the counts above.`);
p(`  SELECT string_agg(format('%s=%s', category_id, total_levels), ', ' ORDER BY category_id)`);
p(`    INTO short`);
p(`    FROM public.categories`);
p(`   WHERE category_id IN (${slugs.map(lit).join(", ")})`);
p(`     AND COALESCE(total_levels, 0) < 17;`);
p(`  IF short IS NOT NULL THEN`);
p(`    RAISE EXCEPTION 'questions landed but total_levels did not follow: %', short;`);
p(`  END IF;`);
p(`END $$;`);
p();
p(`COMMIT;`);

process.stdout.write(out.join("\n") + "\n");

/**
 * The end-to-end harness, emitted to supabase/tests/.
 *
 * The migration reads its category and its icon from the Georgian source row
 * and writes through a unique index — none of which a review of the SQL can
 * confirm. So a scratch Postgres is seeded with the shape the real database
 * has today (each short category holding exactly what it holds now), the
 * migration is applied, and every language is asserted at ${TARGET}.
 *
 * Applied TWICE on purpose. "Re-runnable" is the claim most likely to be
 * false and least likely to be noticed: a second run that duplicated every
 * row would leave the counts at 340 and the category still looking healthy.
 */
function buildFixture(migrationPath) {
  const f = [];
  const q = (s = "") => f.push(s);
  const ALL = ["ka", ...LANGS];
  const slugs = [...Object.keys(sourcesByCategory), ...Object.keys(literature)];

  q(`-- The level-17 backfill, applied to a scratch database and checked.`);
  q(`--`);
  q(`-- Generated by scripts/build-level17-migration.mjs --fixture. Regenerate`);
  q(`-- rather than editing, or it stops describing the migration it tests.`);
  q(`--`);
  q(`-- Eight categories advertised fewer than 17 levels. In six of them that`);
  q(`-- was never a content shortage: Georgian held roughly twice what every`);
  q(`-- other language did, because translate-questions only ever fans the`);
  q(`-- ENGLISH bank out and a question authored in Georgian is invisible to`);
  q(`-- it. The migration translates that tail. This seeds a database with`);
  q(`-- the same shape and proves the tail lands where it is needed.`);
  q();
  q(`\\set ON_ERROR_STOP on`);
  q(`\\pset pager off`);
  q();
  q(`CREATE OR REPLACE FUNCTION pg_temp.must_equal(got bigint, want bigint, label text)`);
  q(`RETURNS void LANGUAGE plpgsql AS $$`);
  q(`BEGIN`);
  q(`  IF got IS DISTINCT FROM want THEN`);
  q(`    RAISE EXCEPTION 'FAILED: % -- got %, want %', label, got, want;`);
  q(`  END IF;`);
  q(`END $$;`);
  q();
  q(`-- A clean slate for exactly the eight slugs this touches; anything else`);
  q(`-- in the database belongs to another test file.`);
  q(`DELETE FROM questions WHERE category_id IN (SELECT id FROM categories WHERE category_id IN (${slugs.map(lit).join(", ")}));`);
  q(`DELETE FROM categories WHERE category_id IN (${slugs.map(lit).join(", ")});`);
  q();

  // --- the six shared categories -----------------------------------------
  for (const [slug, ids] of Object.entries(sourcesByCategory)) {
    const need = ids.length;
    q(`-- ${slug}: short by ${need} in each of ${LANGS.join("/")}, with ${need} untranslated`);
    q(`-- Georgian rows sitting there unused.`);
    q(`INSERT INTO categories (category_id, name, total_levels, language, is_language_specific, is_active)`);
    q(`VALUES (${lit(slug)}, ${lit(slug)}, 1, 'ka', false, true);`);
    q(`INSERT INTO questions (category_id, question_text, correct_answer, incorrect_answers, language, difficulty, level_number, is_active, in_production)`);
    q(`SELECT c.id, ${lit(slug)}||'-'||l.lang||'-'||g, 'a', '["b","c","d"]'::jsonb, l.lang, 'easy', 1, true, true`);
    q(`  FROM categories c, unnest(ARRAY['ka']) AS l(lang), generate_series(1, ${TARGET}) g`);
    q(` WHERE c.category_id = ${lit(slug)};`);
    q(`INSERT INTO questions (category_id, question_text, correct_answer, incorrect_answers, language, difficulty, level_number, is_active, in_production)`);
    q(`SELECT c.id, ${lit(slug)}||'-'||l.lang||'-'||g, 'a', '["b","c","d"]'::jsonb, l.lang, 'easy', 1, true, true`);
    q(`  FROM categories c, unnest(ARRAY[${LANGS.map(lit).join(", ")}]) AS l(lang), generate_series(1, ${TARGET - need}) g`);
    q(` WHERE c.category_id = ${lit(slug)};`);
    q(`-- The Georgian tail, at the ids the migration names.`);
    q(`INSERT INTO questions (id, category_id, question_text, correct_answer, incorrect_answers, language, difficulty, level_number, icon_slug, is_active, in_production)`);
    q(`SELECT s.id::uuid, c.id, ${lit(slug)}||'-source-'||s.id, 'a', '["b","c","d"]'::jsonb, 'ka', 'medium', 7, 'brain', true, true`);
    q(`  FROM categories c, unnest(ARRAY[`);
    q(ids.map((id) => `    ${lit(id)}`).join(",\n"));
    q(`  ]) AS s(id)`);
    q(` WHERE c.category_id = ${lit(slug)};`);
    q();
  }

  // --- the two language-specific ones ------------------------------------
  for (const [slug, rows] of Object.entries(literature)) {
    const lang = rows[0].language;
    q(`-- ${slug}: ${lang} only, ${rows.length} short, and nothing to translate from.`);
    q(`INSERT INTO categories (category_id, name, total_levels, language, is_language_specific, is_active)`);
    q(`VALUES (${lit(slug)}, ${lit(slug)}, 1, ${lit(lang)}, true, true);`);
    q(`INSERT INTO questions (category_id, question_text, correct_answer, incorrect_answers, language, difficulty, level_number, is_active, in_production)`);
    q(`SELECT c.id, ${lit(slug)}||'-'||g, 'a', '["b","c","d"]'::jsonb, ${lit(lang)}, 'easy', 1, true, true`);
    q(`  FROM categories c, generate_series(1, ${TARGET - rows.length}) g`);
    q(` WHERE c.category_id = ${lit(slug)};`);
    q();
  }

  q(`-- Before: every one of them is short.`);
  q(`DO $$`);
  q(`DECLARE n bigint;`);
  q(`BEGIN`);
  q(`  SELECT count(*) INTO n FROM public.categories c`);
  q(`   WHERE c.category_id IN (${slugs.map(lit).join(", ")})`);
  q(`     AND (SELECT count(*) FROM public.questions q`);
  q(`           WHERE q.category_id = c.id AND q.language = 'en' AND q.is_active AND q.in_production) >= ${TARGET};`);
  q(`  PERFORM pg_temp.must_equal(n, 0, 'no shared category starts at ${TARGET} English questions');`);
  q(`END $$;`);
  q();
  q(`\\i ${migrationPath}`);
  q();
  q(`-- And again, because "re-runnable" is the claim most likely to be false`);
  q(`-- and least likely to be noticed.`);
  q(`\\i ${migrationPath}`);
  q();

  q(`-- After: ${TARGET} in every language served, counted exactly — a second`);
  q(`-- run that duplicated its rows would read 340 here, not ${TARGET}.`);
  q(`DO $$`);
  q(`DECLARE n bigint;`);
  q(`BEGIN`);
  for (const [slug, ids] of Object.entries(sourcesByCategory)) {
    for (const lang of ALL) {
      const want = lang === "ka" ? TARGET + ids.length : TARGET;
      q(`  SELECT count(*) INTO n FROM public.questions q JOIN public.categories c ON c.id = q.category_id`);
      q(`   WHERE c.category_id = ${lit(slug)} AND q.language = ${lit(lang)} AND q.is_active AND q.in_production;`);
      q(`  PERFORM pg_temp.must_equal(n, ${want}, ${lit(`${slug}/${lang}`)});`);
    }
  }
  for (const [slug, rows] of Object.entries(literature)) {
    q(`  SELECT count(*) INTO n FROM public.questions q JOIN public.categories c ON c.id = q.category_id`);
    q(`   WHERE c.category_id = ${lit(slug)} AND q.language = ${lit(rows[0].language)} AND q.is_active AND q.in_production;`);
    q(`  PERFORM pg_temp.must_equal(n, ${TARGET}, ${lit(`${slug}/${rows[0].language}`)});`);
  }
  q(`END $$;`);
  q();

  q(`-- The number the player is shown, which the trigger owns.`);
  q(`DO $$`);
  q(`DECLARE r record;`);
  q(`BEGIN`);
  q(`  FOR r IN SELECT category_id, total_levels FROM public.categories`);
  q(`            WHERE category_id IN (${slugs.map(lit).join(", ")}) LOOP`);
  q(`    PERFORM pg_temp.must_equal(r.total_levels, 17, r.category_id || ' total_levels');`);
  q(`  END LOOP;`);
  q(`END $$;`);
  q();

  q(`-- Lineage: each translated row points at the Georgian question it came`);
  q(`-- from. Pointing the ENGLISH row at the Georgian source, rather than the`);
  q(`-- other way round, is what keeps get_untranslated_questions from later`);
  q(`-- picking these up and translating them back into Georgian as`);
  q(`-- duplicates — it only ever selects English rows whose translated_from`);
  q(`-- is NULL.`);
  q(`DO $$`);
  q(`DECLARE n bigint;`);
  q(`BEGIN`);
  q(`  SELECT count(*) INTO n FROM public.questions t`);
  q(`    JOIN public.questions src ON src.id = t.translated_from`);
  q(`   WHERE src.language = 'ka' AND t.language <> 'ka'`);
  q(`     AND src.category_id IN (SELECT id FROM public.categories WHERE category_id IN (${Object.keys(sourcesByCategory).map(lit).join(", ")}));`);
  q(`  PERFORM pg_temp.must_equal(n, ${nSources * LANGS.length}, 'translated rows linked to a Georgian source');`);
  q();
  q(`  SELECT count(*) INTO n FROM public.questions`);
  q(`   WHERE language = 'en' AND translated_from IS NOT NULL AND is_active AND in_production`);
  q(`     AND category_id IN (SELECT id FROM public.categories WHERE category_id IN (${Object.keys(sourcesByCategory).map(lit).join(", ")}));`);
  q(`  PERFORM pg_temp.must_equal(n, ${nSources}, 'English rows the translator will now skip');`);
  q(`END $$;`);
  q();
  q(`-- The icon and the difficulty come from the source rather than being`);
  q(`-- invented, so a translated row looks like the question it translates.`);
  q(`DO $$`);
  q(`DECLARE n bigint;`);
  q(`BEGIN`);
  q(`  SELECT count(*) INTO n FROM public.questions t`);
  q(`    JOIN public.questions src ON src.id = t.translated_from`);
  q(`   WHERE src.language = 'ka'`);
  q(`     AND (t.icon_slug IS DISTINCT FROM src.icon_slug`);
  q(`       OR t.difficulty IS DISTINCT FROM src.difficulty`);
  q(`       OR t.level_number IS DISTINCT FROM src.level_number`);
  q(`       OR t.category_id IS DISTINCT FROM src.category_id);`);
  q(`  PERFORM pg_temp.must_equal(n, 0, 'translated rows inherit icon, difficulty, level and category');`);
  q(`END $$;`);
  q();
  q(`\\echo 'ok: level-17 backfill'`);

  return f.join("\n") + "\n";
}
