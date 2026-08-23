import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { MAX_PLAYABLE_LEVEL } from "@/services/questionService";

/**
 * Two ceilings that have to be the same number.
 *
 * getCategoryQuestions asks for a window around the player's level, and its
 * fallback asks for level_number BETWEEN 1 AND a ceiling. A level numbered
 * above that matches neither, falls through to the "clear every exclusion and
 * take anything" path, and hands back questions the player has already seen.
 *
 * update_category_total_levels caps the advertised level count at a ceiling
 * of its own. The two are independent numbers in two languages in two
 * repositories' worth of tooling, and when they disagree nothing errors:
 *
 *   DB higher than client  -> levels the selector cannot fill, i.e. repeats
 *                             (this is the bug players actually reported)
 *   DB lower than client   -> questions above the line are never reachable
 *
 * So this pins them together. If you raise one, this fails until you raise
 * the other.
 */
describe("the client and the database agree on the highest level", () => {
  const migrations = join(process.cwd(), "supabase/migrations");

  /** The cap in the newest migration that redefines the level counter.
   *
   * Only the newest one is the rule. The original definition predates the
   * cap entirely -- it counted every language's rows together and divided by
   * ten, which is what advertised 49 levels for a 70-question category --
   * and asserting against history would just pin the bug. Migrations sort by
   * their timestamp prefix, so the last match is what the database ends up
   * running. */
  function databaseCeiling(): number {
    const files = readdirSync(migrations)
      .filter(f => f.endsWith(".sql"))
      .sort();
    let newestDefinition: { file: string; sql: string } | null = null;
    for (const file of files) {
      const sql = readFileSync(join(migrations, file), "utf8");
      if (/CREATE OR REPLACE FUNCTION public\.update_category_total_levels/.test(sql)) {
        newestDefinition = { file, sql };
      }
    }
    expect(
      newestDefinition,
      "no migration defines update_category_total_levels",
    ).not.toBeNull();

    const cap = newestDefinition!.sql.match(
      /LEAST\((\d+),\s*GREATEST\(1,\s*FLOOR\(MIN\(per_language\)/,
    );
    expect(
      cap,
      `${newestDefinition!.file} is the live definition of the level counter and ` +
        "has no LEAST() cap — without one a category can advertise levels the " +
        "selector cannot fill",
    ).not.toBeNull();
    return Number(cap![1]);
  }

  it("uses the same ceiling on both sides", () => {
    expect(
      databaseCeiling(),
      "the database caps total_levels somewhere the client cannot serve — " +
        "raise MAX_PLAYABLE_LEVEL and the migration together, or players get repeats",
    ).toBe(MAX_PLAYABLE_LEVEL);
  });

  it("does not leave a bare number in the selector", () => {
    const source = readFileSync(
      join(process.cwd(), "src/services/questionService.ts"),
      "utf8",
    );
    // Both the window clamp and the fallback have to read the constant. A
    // literal in either is a second ceiling that nothing keeps in step.
    expect(source).toMatch(/Math\.min\(MAX_PLAYABLE_LEVEL,\s*levelNumber \+ 5\)/);
    expect(source).toMatch(/\.lte\('level_number',\s*MAX_PLAYABLE_LEVEL\)/);
  });

  it("keeps the generator inside what the game can serve", () => {
    const generator = readFileSync(
      join(process.cwd(), "scripts/popular-image-categories/build-expansion.py"),
      "utf8",
    );
    const cap = generator.match(/^MAX_LEVEL\s*=\s*(\d+)/m);
    expect(cap, "the expansion generator must declare a MAX_LEVEL").not.toBeNull();
    expect(
      Number(cap![1]),
      "the generator would write level numbers the selector cannot reach",
    ).toBeLessThanOrEqual(MAX_PLAYABLE_LEVEL);
  });
});
