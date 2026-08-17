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
