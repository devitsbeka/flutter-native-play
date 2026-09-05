/**
 * An English host started a game and saw "სხვადასხვა" before their own round.
 *
 * Rooms denormalize `category_name` when the round is picked, in the language
 * of whoever picked it. useLocalizedCategoryName exists to undo that — it
 * maps a name in any language back through `categories` and out in the
 * viewer's — but it can only do that for names that ARE categories.
 *
 * "Mixed" and "Random" are not. They are pseudo-categories the pickers
 * invent (`__mixed__`, with the label pulled from the picker's own locale),
 * so there is no row to map through and the stored string passed straight
 * out. Whatever language wrote it, everyone read it.
 *
 * Sixteen call sites shared that blind spot, so the fix is in the resolver
 * rather than in each of them.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isUndecidedRound, undecidedRoundKind } from "@/utils/undecidedRound";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const resolver = read("src/utils/categoryDisplayName.ts");
const countdown = read("src/components/team/RoundCountdown.tsx");

describe("telling mixed from random, run rather than read", () => {
  it("knows mixed in every language a picker could have written it in", () => {
    for (const n of ["Mixed", "სხვადასხვა", "შერეული", "Gemischt", "Mixto", "Mixte", "Misto"]) {
      expect(undecidedRoundKind(null, n), n).toBe("mixed");
    }
  });

  it("and random likewise", () => {
    for (const n of [
      "Random", "შემთხვევითი", "Zufällig", "Aleatorio", "Aléatoire", "Casuale", "Aleatório",
    ]) {
      expect(undecidedRoundKind(null, n), n).toBe("random");
    }
  });

  it("prefers the id, which is the same in every language", () => {
    expect(undecidedRoundKind("__mixed__", "სხვადასხვა")).toBe("mixed");
    expect(undecidedRoundKind("__random__", null)).toBe("random");
    expect(undecidedRoundKind("mixed", null)).toBe("mixed");
  });

  it("ignores case and stray whitespace, as stored names carry both", () => {
    expect(undecidedRoundKind(null, "  MIXED ")).toBe("mixed");
    expect(undecidedRoundKind(null, "aleatório")).toBe("random");
  });

  it("a real category is not swept up", () => {
    // Verified against production while writing this: none of the 742 real
    // category names, base or translated, is Mixed or Random in any
    // language — so nothing real is caught.
    for (const n of ["History", "ისტორია", "Mixed Martial Arts", "Random Facts", "Geography"]) {
      expect(undecidedRoundKind(null, n), n).toBeNull();
    }
    expect(undecidedRoundKind(null, "")).toBeNull();
    expect(undecidedRoundKind(null, null)).toBeNull();
    expect(undecidedRoundKind(undefined, undefined)).toBeNull();
  });

  it("and the picture still says mystery box for both", () => {
    // The kind decides the WORD; isUndecidedRound decides the PICTURE, and
    // they must agree about what counts.
    for (const n of ["Mixed", "სხვადასხვა", "Random", "შემთხვევითი"]) {
      expect(isUndecidedRound(null, n), n).toBe(true);
      expect(undecidedRoundKind(null, n), n).not.toBeNull();
    }
    expect(isUndecidedRound(null, "History")).toBe(false);
  });
});

describe("the resolver answers for them, so every screen is fixed at once", () => {
  it("checks before consulting the category map", () => {
    // The map can never answer for a pseudo-category, so asking it first
    // would just return the stored string again.
    const check = resolver.indexOf("const kind = undecidedRoundKind(null, stored);");
    const mapGet = resolver.indexOf("return map?.get(stored) ?? stored;");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(mapGet);
    expect(resolver).toMatch(
      /return t\(kind === "mixed" \? "extra\.mixedCategory" : "extra\.cpRandomTitle"\);/,
    );
  });

  it("and re-resolves when the language changes", () => {
    expect(resolver).toMatch(/const \{ t \} = useLanguage\(\);/);
    expect(resolver).toMatch(/\[map, t\],/);
  });
});

describe("the countdown, which is where it was caught", () => {
  it("says it in the viewer's language, from the id when it has one", () => {
    expect(countdown).toMatch(/const undecided = undecidedRoundKind\(categoryId, categoryName\);/);
    expect(countdown).toMatch(
      /\? t\(undecided === "mixed" \? "extra\.mixedCategory" : "extra\.cpRandomTitle"\)/,
    );
  });

  it("and a real category still goes through the map", () => {
    expect(countdown).toMatch(/: localizeCategory\(categoryName \|\| ""\) \|\| t\("extra\.categoryType"\);/);
  });
});

describe("both labels exist in all seven languages", () => {
  it("mixed and random", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, `${lang}.mixedCategory`).toMatch(/\n\s+mixedCategory: "[^"]+",/);
      expect(locale, `${lang}.cpRandomTitle`).toMatch(/\n\s+cpRandomTitle: "[^"]+",/);
    }
  });

  it("and every one of them is recognised on the way back in", () => {
    // A label this app can print must be a label it can also read: the
    // round-trip is what makes a room started in one language legible in
    // another.
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      const mixed = /\n\s+mixedCategory: "([^"]+)",/.exec(locale)?.[1];
      const random = /\n\s+cpRandomTitle: "([^"]+)",/.exec(locale)?.[1];
      expect(undecidedRoundKind(null, mixed), `${lang} mixed=${mixed}`).toBe("mixed");
      expect(undecidedRoundKind(null, random), `${lang} random=${random}`).toBe("random");
    }
  });
});
