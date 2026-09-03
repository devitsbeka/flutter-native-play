import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getCategoryIconSlug } from "@/data/categoryIconMap";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * Every category must name an icon the shipped library actually has.
 *
 * DynamicIcon's last resort, when it cannot place what it was given, is an
 * icon chosen by hashing the id — stable per category and unrelated to the
 * subject. It is not a blank space, so a category that falls through here does
 * not look broken; it looks like a decision. "Guess the city" was illustrated
 * with a banana for exactly this reason, and nothing failed to make that
 * visible except somebody looking at the screen.
 *
 * The category list is a fixture rather than a live query — CI has no
 * database — so refresh it if categories are added:
 *
 *   select category_id, icon_slug from categories order by category_id;
 */

interface Row {
  category_id: string;
  icon_slug: string | null;
}

const CATEGORIES: Row[] = JSON.parse(
  readFileSync(new URL("./fixtures/categories.json", import.meta.url), "utf8"),
);

const LIBRARY: Set<string> = new Set(
  (JSON.parse(readFileSync("public/data/icon-index-slim.json", "utf8")).items as { slug: string }[])
    .map((i) => i.slug),
);

/** What RoundCountdown offers DynamicIcon, best first. */
function slugCandidates(row: Row): string[] {
  const mapSlug = getCategoryIconSlug(row.category_id);
  return [row.icon_slug, mapSlug].filter(Boolean) as string[];
}

describe("category icon coverage", () => {
  it("has a real library icon for every category", () => {
    const unresolved = CATEGORIES.filter((row) => {
      // The picture-guess six ship their own 3D art and never consult a slug.
      if ((POPULAR_IMAGE_CATEGORY_IDS as readonly string[]).includes(row.category_id)) return false;
      return !slugCandidates(row).some((slug) => LIBRARY.has(slug));
    }).map((row) => `${row.category_id} (icon_slug=${row.icon_slug})`);

    expect(unresolved).toEqual([]);
  });

  it("names every category's own icon in the shipped index, not just a stand-in", () => {
    // These two were the exceptions: their icon_slug existed in storage and
    // in icon_library, but not in the file the client ships, so they resolved
    // only on the per-card database lookup — a round trip that may or may not
    // land inside the life of a three-second screen, and on Discover simply
    // left two blank cards. The rows are in the index now.
    //
    // Anything with an icon_slug should be findable without asking the
    // network. A category that fails here is not broken, it is slow and
    // occasionally blank, which is harder to see.
    const viaLookupOnly = CATEGORIES.filter(
      (row) => row.icon_slug && !LIBRARY.has(row.icon_slug),
    ).map((row) => `${row.category_id} (icon_slug=${row.icon_slug})`);

    expect(viaLookupOnly).toEqual([]);

    // The map fallback still has to be there for the ones that name nothing.
    for (const id of ["archaeology", "economics"]) {
      const row = CATEGORIES.find((c) => c.category_id === id);
      expect(row, `${id} missing from fixture`).toBeDefined();
      expect(slugCandidates(row!).some((s) => LIBRARY.has(s))).toBe(true);
    }
  });

  it("gives the national categories an icon for their subject", () => {
    // Twenty <language>_<subject> categories with no icon_slug at all.
    const expected: Record<string, string> = {
      french_history: "scroll",
      german_literature: "book",
      italian_cuisine: "chef",
      portuguese_culture: "theater",
    };
    for (const [id, slug] of Object.entries(expected)) {
      expect(getCategoryIconSlug(id)).toBe(slug);
      expect(LIBRARY.has(slug)).toBe(true);
    }
  });

  it("does not let the subject rule override a category's own icon", () => {
    // military_history ends in "history" but names a sword, and should keep it.
    expect(getCategoryIconSlug("military_history")).toBe("sword");
  });
});
