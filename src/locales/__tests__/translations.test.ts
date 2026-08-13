import { describe, it, expect } from "vitest";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  getLanguage,
  getRegionForLanguage,
  translations,
} from "@/locales";

// Seven locales, 3,625 keys each.
//
// HOW THESE FILES ARE BUILT, because it determines what is worth testing:
// `ka` is written out in full and defines the shape; `en` is typed against it,
// so TypeScript already catches a key missing from either. The other five are
// built as `{ ...en, section: { ...en.section, ... } }`, so a key they do not
// translate falls back to the English string. That fallback means a missing
// key can never surface as a raw "modals.foo" path — but it also means a key
// deleted from, say, fr.ts fails nothing at all. Tests that "check for missing
// keys" would pass vacuously here, so this file checks the things that can
// actually go wrong instead: placeholders that disagree, values that are
// blank, keys that no locale recognises, and the registry itself.

const BASE_LOCALE = "ka";

type Flat = Record<string, string>;

function flatten(value: unknown, prefix = ""): Flat {
  const out: Flat = {};
  for (const [key, child] of Object.entries((value ?? {}) as Record<string, unknown>)) {
    const path = `${prefix}${key}`;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      Object.assign(out, flatten(child, `${path}.`));
    } else {
      out[path] = child as string;
    }
  }
  return out;
}

/** The `{name}` placeholders in a string, sorted, as a comparable signature. */
const placeholders = (text: string): string =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const FLAT: Record<string, Flat> = Object.fromEntries(
  Object.entries(translations).map(([code, t]) => [code, flatten(t)])
);
const BASE = FLAT[BASE_LOCALE];
const BASE_KEYS = Object.keys(BASE);
const LOCALE_CODES = Object.keys(translations);

// Deliberately blank strings. Keep this list at zero where possible.
const ALLOWED_EMPTY = new Set<string>([
  // Present in all six other locales but blank in Georgian. No component
  // reads this key today, so nothing renders blank; filling it in wants a
  // native speaker rather than a guess.
  "ka:modals.createAccountToContinue",
]);

// How much of each locale is actually translated rather than falling through
// to English, measured when this test was written:
//   ka 99.3% · it 79.0% · fr 62.1% · pt 61.8% · es 61.7% · de 61.2%
// The floor is set below all of them so it catches a locale rotting or being
// added as an empty shell, without pinning today's exact numbers.
const MIN_TRANSLATED_FRACTION = 0.55;

describe("locale registry", () => {
  it("ships translations for every selectable language", () => {
    for (const language of LANGUAGES) {
      expect(translations[language.code], `no translations for ${language.code}`).toBeDefined();
    }
  });

  it("makes every shipped locale selectable", () => {
    // Set<string>: LOCALE_CODES comes from Object.keys(), so it is string[]
    const declared = new Set<string>(LANGUAGES.map((l) => l.code));
    for (const code of LOCALE_CODES) {
      expect(declared.has(code), `${code} has translations but is not selectable`).toBe(true);
    }
  });

  it("uses a default language that exists", () => {
    expect(translations[DEFAULT_LANGUAGE]).toBeDefined();
    expect(LANGUAGES.some((l) => l.code === DEFAULT_LANGUAGE)).toBe(true);
  });

  it("gives every language a unique code and full display metadata", () => {
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(LANGUAGES.length);
    for (const language of LANGUAGES) {
      expect(language.name.length, language.code).toBeGreaterThan(0);
      expect(language.nativeName.length, language.code).toBeGreaterThan(0);
      expect(language.flag.length, language.code).toBeGreaterThan(0);
      expect(language.region.length, language.code).toBeGreaterThan(0);
    }
  });
});

describe("getLanguage / getRegionForLanguage", () => {
  it("looks up a known language", () => {
    expect(getLanguage("en").nativeName).toBe("English");
    expect(getRegionForLanguage("ka")).toBe("ge");
  });

  it("falls back to the first language for an unknown code", () => {
    // Never undefined — callers read .flag and .nativeName straight off it.
    expect(getLanguage("xx")).toBe(LANGUAGES[0]);
    expect(getLanguage("")).toBe(LANGUAGES[0]);
  });

  it("falls back to the global region for an unknown code", () => {
    expect(getRegionForLanguage("xx")).toBe("global");
  });
});

describe("every locale resolves every key", () => {
  it("has a meaningful number of keys to compare", () => {
    // Guards against flattening silently returning nothing, which would make
    // every check below pass vacuously.
    expect(BASE_KEYS.length).toBeGreaterThan(3000);
  });

  for (const code of LOCALE_CODES) {
    it(`${code} resolves every key to a non-empty string`, () => {
      // For the five spread locales this is guaranteed by the English
      // fallback; it is still worth asserting, because it is the property
      // the UI depends on and the spread could be dropped.
      const bad = BASE_KEYS.filter((key) => {
        if (ALLOWED_EMPTY.has(`${code}:${key}`)) return false;
        const value = FLAT[code][key];
        return typeof value !== "string" || value.trim() === "";
      });
      expect(bad, `${code} has ${bad.length} empty or non-string values`).toEqual([]);
    });

    it(`${code} defines no keys the base locale lacks`, () => {
      // This one does bite: a typo'd key is added rather than overriding, so
      // the intended string keeps falling back to English forever.
      const extra = Object.keys(FLAT[code]).filter((key) => !(key in BASE));
      expect(extra, `${code} has unknown keys: ${extra.slice(0, 5).join(", ")}`).toEqual([]);
    });

    it(`${code} uses the same placeholders as the base locale`, () => {
      // The sharpest check here. A dropped or renamed placeholder either
      // prints a literal "{count}" on screen or silently loses the value,
      // and no type error catches it.
      const mismatches = BASE_KEYS.filter((key) => {
        const value = FLAT[code][key];
        if (typeof value !== "string") return false;
        return placeholders(value) !== placeholders(BASE[key]);
      }).map(
        (key) => `${key}: expected {${placeholders(BASE[key])}} got {${placeholders(FLAT[code][key])}}`
      );

      expect(mismatches, `${code}: ${mismatches.slice(0, 5).join(" | ")}`).toEqual([]);
    });
  }
});

describe("translation coverage", () => {
  const en = FLAT.en;
  const translatedFraction = (code: string): number => {
    const differing = BASE_KEYS.filter((key) => FLAT[code][key] !== en[key]).length;
    return differing / BASE_KEYS.length;
  };

  for (const code of LOCALE_CODES) {
    if (code === "en") continue;
    it(`${code} is more than ${MIN_TRANSLATED_FRACTION * 100}% translated`, () => {
      // A locale offered in the language picker but still mostly English is
      // worse than not offering it at all.
      const fraction = translatedFraction(code);
      expect(
        fraction,
        `${code} is only ${(fraction * 100).toFixed(1)}% translated`
      ).toBeGreaterThan(MIN_TRANSLATED_FRACTION);
    });
  }

  it("keeps the default language essentially fully translated", () => {
    expect(translatedFraction(DEFAULT_LANGUAGE)).toBeGreaterThan(0.95);
  });
});

describe("known exceptions", () => {
  it("keeps the allowed-empty list honest", () => {
    // If a listed key gets filled in, drop it from the list rather than
    // letting the exception outlive the problem.
    for (const entry of ALLOWED_EMPTY) {
      const [code, key] = entry.split(":");
      expect(
        FLAT[code]?.[key],
        `${entry} is no longer empty — remove it from ALLOWED_EMPTY`
      ).toBe("");
    }
  });
});
