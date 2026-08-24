import { describe, expect, it } from "vitest";
import { looksLikeUuid, resolveCategoryIdentity } from "@/utils/categoryIdentity";

/**
 * Rooms disagree about how to name their category, and every icon lookup in
 * the app is keyed on one of the two spellings. Both are in the table today.
 */

const ROWS = [
  { id: "6fa574e2-c61e-5ac2-bf17-85f742804238", category_id: "guess_city", icon_slug: "city" },
  { id: "b352d1cf-a825-48a3-b85b-b916368669a3", category_id: "geography", icon_slug: "globe-earth-centered-on-asia" },
  { id: "11111111-2222-3333-4444-555555555555", category_id: "no_icon", icon_slug: null },
];

describe("resolveCategoryIdentity", () => {
  it("resolves a room that stored the uuid", () => {
    // The case that put a banana on "guess the city": every icon map is keyed
    // on the slug, so a uuid missed them all.
    expect(resolveCategoryIdentity("6fa574e2-c61e-5ac2-bf17-85f742804238", ROWS)).toEqual({
      categoryId: "guess_city",
      iconSlug: "city",
    });
  });

  it("resolves a room that stored the slug", () => {
    expect(resolveCategoryIdentity("geography", ROWS)).toEqual({
      categoryId: "geography",
      iconSlug: "globe-earth-centered-on-asia",
    });
  });

  it("passes a slug through before the rows have loaded", () => {
    // The icon maps already understand a slug, so there is no reason to wait.
    expect(resolveCategoryIdentity("guess_city", null)).toEqual({
      categoryId: "guess_city",
      iconSlug: null,
    });
  });

  it("refuses to pass a uuid through as though it were a slug", () => {
    // Handing a uuid on to DynamicIcon is what produces a random icon, and a
    // confidently wrong picture is worse than a missing one for one frame.
    expect(resolveCategoryIdentity("6fa574e2-c61e-5ac2-bf17-85f742804238", null)).toEqual({
      categoryId: null,
      iconSlug: null,
    });
  });

  it("keeps the slug for a category the library has no icon for", () => {
    expect(resolveCategoryIdentity("no_icon", ROWS)).toEqual({
      categoryId: "no_icon",
      iconSlug: null,
    });
  });

  it("survives an unknown category and an absent one", () => {
    expect(resolveCategoryIdentity("not_a_category", ROWS)).toEqual({
      categoryId: "not_a_category",
      iconSlug: null,
    });
    for (const empty of [null, undefined, ""]) {
      expect(resolveCategoryIdentity(empty, ROWS)).toEqual({ categoryId: null, iconSlug: null });
    }
  });
});

describe("looksLikeUuid", () => {
  it("tells the two id shapes apart", () => {
    expect(looksLikeUuid("6fa574e2-c61e-5ac2-bf17-85f742804238")).toBe(true);
    expect(looksLikeUuid("6FA574E2-C61E-5AC2-BF17-85F742804238")).toBe(true);
    for (const slug of ["guess_city", "geography", "", null, undefined, "6fa574e2"]) {
      expect(looksLikeUuid(slug)).toBe(false);
    }
  });
});
