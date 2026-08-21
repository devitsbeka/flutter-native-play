import { describe, expect, it } from "vitest";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";

// Language-specific categories (Spanish Cuisine, Georgian History, ...) must
// only be offered to readers whose app language matches. They leaked into the
// room Library picker for everyone once; this pins the shared predicate.
describe("filterCategoriesForLanguage", () => {
  const rows = [
    { id: "movies", is_language_specific: false, language: null },
    { id: "legacy", is_language_specific: null, language: null },
    { id: "spanish_cuisine", is_language_specific: true, language: "es" },
    { id: "georgian_history", is_language_specific: true, language: "ka" },
  ];

  it("gives an English reader only universal categories", () => {
    expect(filterCategoriesForLanguage(rows, "en").map((r) => r.id)).toEqual([
      "movies",
      "legacy",
    ]);
  });

  it("gives a Spanish reader universal plus Spanish-specific", () => {
    expect(filterCategoriesForLanguage(rows, "es").map((r) => r.id)).toEqual([
      "movies",
      "legacy",
      "spanish_cuisine",
    ]);
  });

  it("gives a Georgian reader universal plus Georgian-specific", () => {
    expect(filterCategoriesForLanguage(rows, "ka").map((r) => r.id)).toEqual([
      "movies",
      "legacy",
      "georgian_history",
    ]);
  });
});
