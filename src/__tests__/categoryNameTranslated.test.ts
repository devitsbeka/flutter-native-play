import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A category heading must not be the raw `categories.name`.
 *
 * That column is Georgian for every player — there is one row per category,
 * and the other six languages live in `category_translations`. Discover reads
 * them through `useCategories`, so it has always been right; the quiz screen
 * fetched its own single row and rendered the Georgian name straight out, and
 * an English game was played under a Georgian heading.
 *
 * The two ways to get it right are `useCategories` (for a screen listing
 * categories) and `useCategoryDisplayName` (for a screen that already has
 * one). This checks the screens that render a heading use one of them.
 */

const SCREENS = [
  "src/pages/CategoryQuizPage.tsx",
  "src/pages/CategoryPage.tsx",
];

describe("category headings are translated", () => {
  for (const file of SCREENS) {
    const source = readFileSync(join(process.cwd(), file), "utf8");

    it(`${file} resolves its name through a translating source`, () => {
      const translates =
        source.includes("useCategoryDisplayName") || source.includes("useCategories");
      expect(
        translates,
        `${file} shows a category name but reads neither useCategories nor ` +
          `useCategoryDisplayName, so it will render the Georgian ` +
          `categories.name to every player.`,
      ).toBe(true);
    });

    it(`${file} does not render dbCategory.name directly`, () => {
      // The raw row is still fetched for its icon and level count; it is
      // putting its `name` on screen that is the mistake.
      const rendered = /\{\s*dbCategory\?\.name/.test(source);
      expect(
        rendered,
        `${file} renders dbCategory.name — that is the untranslated Georgian ` +
          `column. Pass it through useCategoryDisplayName instead.`,
      ).toBe(false);
    });
  }
});
