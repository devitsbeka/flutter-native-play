import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Eight categories advertised fewer than 17 levels.
 *
 * The obvious reading — "the bank is thin there" — was wrong, and the shape
 * of the numbers said so: in six of the eight, Georgian held roughly twice
 * what every other language did, and the six non-Georgian languages had
 * *identical* counts to each other.
 *
 *   myths_reality   ka 258   en/de/es/fr/it/pt 137 each
 *   anime_manga     ka 281   en/de/es/fr/it/pt 156 each
 *
 * That is a translation gap, not a content shortage. translate-questions fans
 * the ENGLISH bank out, and get_untranslated_questions selects sources with
 * `language = 'en' AND translated_from IS NULL` — so a question authored in
 * Georgian is invisible to the pipeline forever. 936 such rows sit across
 * those six categories, raising nobody's level count, Georgian's included,
 * because total_levels divides the THINNEST language by ten.
 *
 * So the migration translates the tail instead of inventing more questions.
 *
 * That the SQL does what it claims is proved against a real Postgres in
 * supabase/tests/07-level17-backfill.sql, which seeds a database with the
 * same shape and runs the migration twice. What is left for here is cheaper
 * and just as easy to get wrong: that the two committed SQL files still match
 * the translations they were generated from. Hand-editing 1,300 lines of
 * generated INSERTs is the obvious next move for whoever wants to add one
 * question, and it silently decouples them.
 */
const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20260914100000_level17_backfill.sql";
const FIXTURE = "supabase/tests/07-level17-backfill.sql";
const GENERATOR = "scripts/build-level17-migration.mjs";

const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const generate = (...args: string[]) =>
  execFileSync("node", [join(ROOT, GENERATOR), ...args], { cwd: ROOT, encoding: "utf8" });

describe("the generated SQL still matches its source", () => {
  it("the migration is what the generator emits", () => {
    expect(generate()).toBe(read(MIGRATION));
  });

  it("so is the Postgres fixture", () => {
    expect(generate("--fixture", MIGRATION)).toBe(read(FIXTURE));
  });
});

describe("the translations themselves", () => {
  const LANGS = ["en", "de", "es", "fr", "it", "pt"] as const;
  const sql = read(MIGRATION);

  it("covers every language for every source question", () => {
    // 67 Georgian sources × 6 languages. Each source is one INSERT whose
    // VALUES list carries all six; a missing language would be a category
    // that lands at 169 and still shows 16 levels.
    const inserts = sql.match(/ON CONFLICT \(translated_from, language\) DO NOTHING;/g) ?? [];
    expect(inserts).toHaveLength(67);
    for (const lang of LANGS) {
      expect(sql.match(new RegExp(`^    \\('${lang}', `, "gm")) ?? []).toHaveLength(67);
    }
  });

  it("adds exactly the shortfall, and no more", () => {
    // 67 × 6 translated, plus 5 written for the two literature categories.
    // The gap measured against the live database was 407.
    const translated = 67 * LANGS.length;
    const written = (sql.match(/^ {3}AND NOT EXISTS \($/gm) ?? []).length;
    expect(written).toBe(5);
    expect(translated + written).toBe(407);
  });

  it("points each translation at its Georgian source, not the other way round", () => {
    // get_untranslated_questions only picks English rows whose
    // translated_from IS NULL. Writing the English row with a source set is
    // what stops the pipeline translating these back into Georgian as
    // duplicates — and the unique index is what makes a re-run free.
    expect(sql).toMatch(/is_active, in_production, translated_from/);
    expect(sql).toMatch(/src\.icon_slug, src\.image_url, true, true, src\.id/);
    expect(sql).not.toMatch(/translated_from IS NULL/);
  });

  it("copies category, icon, difficulty and level from the source row", () => {
    // Repeating them here would be a second source of truth for values the
    // question already carries, and the only direction it can drift is wrong.
    expect(sql).toMatch(/FROM public\.questions src/);
    expect(sql).toMatch(/SELECT src\.category_id, t\.language/);
  });

  it("refuses to commit a run that quietly inserted nothing", () => {
    // A source row that has since been deleted makes the INSERT a no-op and
    // psql reports "INSERT 0 0" as success. The assertion turns that into a
    // failed transaction instead.
    expect(sql).toMatch(/RAISE EXCEPTION 'still short of 170 questions: %', short;/);
    expect(sql).toMatch(/RAISE EXCEPTION 'questions landed but total_levels did not follow: %', short;/);
  });

  it("leaves total_levels to the trigger", () => {
    // trigger_update_category_levels already recounts AFTER INSERT FOR EACH
    // ROW. A second copy of that arithmetic in a migration is how the recount
    // and the trigger drifted apart once before.
    expect(sql).not.toMatch(/UPDATE public\.categories/);
  });
});
