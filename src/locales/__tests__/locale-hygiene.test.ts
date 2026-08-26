// Locale hygiene guards.
//
// The shape of every locale is already enforced by the KaTranslations type
// (a missing key is a compile error), and the non-ka locales spread `en` as
// their base, so a forgotten key falls back to English — never Georgian.
// What the type system can NOT catch is a Georgian string pasted into a
// non-Georgian locale's value, which is exactly the "Georgian title on an
// English screen" class of bug. This asserts it never happens.
import { describe, it, expect } from "vitest";
import { translations } from "../index";

function flatten(obj: Record<string, unknown>, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      for (const [k2, v2] of flatten(v as Record<string, unknown>, key)) out.set(k2, v2);
    } else if (typeof v === "string") {
      out.set(key, v);
    }
  }
  return out;
}

const GEORGIAN = /[ა-ჰ]/;

describe("locale hygiene", () => {
  const ka = flatten(translations.ka as unknown as Record<string, unknown>);

  for (const lang of ["en", "de", "es", "fr", "it", "pt"]) {
    it(`${lang} carries no Georgian text and no missing keys`, () => {
      const other = flatten(translations[lang] as unknown as Record<string, unknown>);

      const missing = [...ka.keys()].filter((k) => !other.has(k));
      expect(missing, `keys missing from ${lang} (would fall back)`).toEqual([]);

      const georgianValues = [...other.entries()]
        .filter(([, v]) => GEORGIAN.test(v))
        .map(([k, v]) => `${k} = ${v}`);
      expect(georgianValues, `Georgian text inside ${lang} values`).toEqual([]);
    });
  }
});

/**
 * Marketing copy must not name a country the reader is probably not in.
 *
 * The guest landing said "Join thousands of players from GE Georgia" — and it
 * was *translated* into all seven languages, so a German visitor read
 * "Spiele mit tausenden Spielern aus GE Georgien". Translating the sentence
 * while leaving the country fixed is worse than not translating it: it reads
 * as deliberate, and it tells a German player the game is somewhere else.
 * ("Georgia" in English is ambiguous with the US state on top of that.)
 *
 * Georgian keeps it, because there it is the home market and naming it is the
 * whole point. Every other locale is region-neutral.
 */
describe("marketing copy does not hardcode a country", () => {
  // Two regional-indicator letters is how a flag — and with it a country —
  // gets smuggled into a string that is otherwise translated.
  const FLAG = /\p{Regional_Indicator}{2}/u;

  it.each(Object.keys(translations).filter((code) => code !== "ka"))(
    "%s does not name a country in the landing subtitle",
    (code) => {
      const extra = (translations[code] as unknown as Record<string, Record<string, string>>).extra;
      const subtitle = extra?.landingJoinSubtitle ?? "";

      expect(
        FLAG.test(subtitle),
        `${code} landingJoinSubtitle carries a country flag: "${subtitle}". ` +
          "Only the Georgian locale should name a country here."
      ).toBe(false);
    }
  );

  it("keeps the home-market line in Georgian", () => {
    const ka = (translations.ka as unknown as Record<string, Record<string, string>>).extra;
    expect(
      FLAG.test(ka.landingJoinSubtitle),
      "the Georgian locale is the one place naming the country is right"
    ).toBe(true);
  });
});
