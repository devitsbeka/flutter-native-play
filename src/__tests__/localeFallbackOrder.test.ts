import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { translations } from "@/locales";

/**
 * English is the fallback inside `extra`, and a fallback that is spread LAST
 * is not a fallback — it is an override.
 *
 * Five locales opened the block with ten translated keys and then spread
 * `...en.extra` underneath them. Later properties win in an object literal, so
 * every one of those ten was replaced by its English value: a German player
 * read "Questions answered" on the compare screen while "Fragen beantwortet"
 * sat four lines above it in the same file, unused.
 *
 * Nothing failed. `npm run typecheck` passes either way — the repo builds with
 * `strict: false`, and TS2783 (`specified more than once, so this usage will be
 * overwritten`) is only raised under strict. It surfaced as fifty errors in a
 * stricter external typecheck, which is a thin thread to have caught it by.
 *
 * So this file checks the arrangement directly, and then checks the values it
 * is supposed to produce.
 */
describe("the English fallback inside `extra` stays a fallback", () => {
  const LOCALES = ["de", "es", "fr", "it", "pt", "ka", "en"] as const;
  const SPREAD = "...en.extra,";

  const extraBlockOf = (code: string): string => {
    const src = readFileSync(join(process.cwd(), `src/locales/${code}.ts`), "utf8");
    const open = src.indexOf("\n  extra: {\n");
    expect(open, `${code}.ts has no top-level extra block`).toBeGreaterThan(-1);
    // Two-space indentation closes it: the next line that is exactly "  },".
    const close = src.indexOf("\n  },", open + 1);
    return src.slice(open, close);
  };

  it.each(LOCALES)("%s spreads English before its own keys, never after", (code) => {
    const block = extraBlockOf(code);
    if (!block.includes(SPREAD)) return; // en and ka define every key outright.

    const firstKey = block.search(/\n {4}[a-zA-Z_$][\w$]*\s*:/);
    const spreadAt = block.indexOf(SPREAD);
    expect(
      spreadAt,
      `${code}.ts spreads ...en.extra AFTER a key it defines itself, so the ` +
        "English value overwrites the translation. Move the spread to the " +
        "first line of the extra block.",
    ).toBeLessThan(firstKey);
  });

  /**
   * The ten that were actually being overwritten. Read off the loaded
   * translations rather than the file, so this fails if the values stop
   * arriving however that happens.
   */
  it("gives translated locales their own words on the compare screen", () => {
    const KEYS = [
      "questionsAnsweredLabel",
      "successRateLabel",
      "playedTogetherCount",
      "victoriesLabel",
      "drawsCount",
      "theirSpecialty",
      "yourSpecialty",
      "percentSuccess",
    ] as const;

    const en = translations.en.extra as Record<string, string>;

    for (const code of ["de", "es", "fr", "it", "pt"] as const) {
      const extra = translations[code].extra as Record<string, string>;
      for (const key of KEYS) {
        expect(extra[key], `${code}.extra.${key} is missing`).toBeTruthy();
        expect(
          extra[key],
          `${code}.extra.${key} is the English string. The locale defines its ` +
            "own translation — it is being overwritten by ...en.extra.",
        ).not.toBe(en[key]);
      }
    }
  });

  it("still falls back to English for a key a locale never translates", () => {
    // The spread has to keep doing its job: nothing above depends on it being
    // absent, only on it being first.
    const en = translations.en.extra as Record<string, string>;
    const de = translations.de.extra as Record<string, string>;
    const untranslated = Object.keys(en).filter((k) => de[k] === en[k]);
    expect(untranslated.length, "no key falls through to English any more").toBeGreaterThan(0);
  });
});
