import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { categoryIconCandidates, categoryIconSlugSync } from "@/hooks/useCategoryIconSlugs";
import { CATEGORY_ID_TO_ICON } from "@/data/categoryIconMap";

/**
 * A category wears the same icon everywhere.
 *
 * The report: Celebrities showed a singer on Discover and a gold star in the
 * TV round queue. Both draw through DynamicIcon, so it was never a rendering
 * difference — they were being handed different slugs. Discover reads
 * `categories.icon_slug` (`pop-star`); every TV surface read
 * CATEGORY_ID_TO_ICON (`star`).
 *
 * Measured against the live catalogue at the time: of 70 categories, 39
 * disagreed between the two and 25 more were absent from the map. Six matched.
 *
 * The fix is NOT to overwrite the map with the column — the first attempt did
 * that and categoryIconCoverage.test.ts caught it. The map is a complement,
 * not a duplicate: `archaeology` and `economics` name icons the shipped index
 * does not carry, and twenty national categories carry no icon_slug at all.
 * So the column leads and the map follows, both offered to DynamicIcon.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("which slug a category is drawn with", () => {
  it("prefers nothing when it knows nothing", () => {
    expect(categoryIconCandidates(null)).toBeNull();
    expect(categoryIconCandidates(undefined, null)).toBeNull();
  });

  it("offers the map's slug for a category the column has not supplied", () => {
    // No live cache in a unit test, so this is the cold-start path: exactly
    // what a screen draws in the moment before the query lands.
    expect(categoryIconCandidates("celebrities")).toBe(CATEGORY_ID_TO_ICON["celebrities"]);
  });

  it("offers a stored snapshot ahead of the map", () => {
    // A queue row carries the slug it was added with. It beats the map,
    // because it at least came from the column once.
    const out = categoryIconCandidates("celebrities", "pop-star");
    expect(out!.split(",")[0]).toBe("pop-star");
  });

  it("keeps the map as a second candidate, never drops it", () => {
    // This is the bit the first attempt got wrong. DynamicIcon tries each
    // comma-separated slug in turn, and for archaeology/economics the map's
    // slug is the only one the shipped index actually has.
    const out = categoryIconCandidates("archaeology", "archeo");
    expect(out!.split(",")).toContain(CATEGORY_ID_TO_ICON["archaeology"]);
  });

  it("does not repeat a slug when the sources agree", () => {
    const out = categoryIconCandidates("celebrities", CATEGORY_ID_TO_ICON["celebrities"]);
    const parts = out!.split(",");
    expect(parts.length).toBe(new Set(parts).size);
  });

  it("gives a single slug when something is being written down", () => {
    // Persisted onto a queue row — a comma-separated list does not belong in
    // a column that names one icon.
    expect(categoryIconSlugSync("celebrities", "pop-star")).toBe("pop-star");
    expect(categoryIconSlugSync("celebrities")).not.toContain(",");
  });
});

describe("the TV surfaces read the column", () => {
  it("the round queue resolves through the shared lookup", () => {
    const sel = read("src/components/controller/ControllerDirectSelection.tsx");
    expect(sel).toMatch(/const \{ iconSlugFor \} = useCategoryIconSlugs\(\);/);
    expect(sel).toMatch(/iconSlugFor\(item\.category_id, item\.icon_slug\)/);
  });

  it("passes the category through so DynamicIcon has the same fallback Discover gives it", () => {
    const sel = read("src/components/controller/ControllerDirectSelection.tsx");
    expect(sel).toMatch(/categoryId=\{item\.category_id \?\? undefined\}/);
  });

  it("the picker resolves the same way, so it cannot disagree with the queue", () => {
    const sel = read("src/components/controller/ControllerDirectSelection.tsx");
    expect(sel).toMatch(/iconSlugFor\(category\.category_id, category\.icon_slug\)/);
  });

  it("no TV surface reads the hardcoded map as its primary source any more", () => {
    for (const f of ["src/hooks/useTVSessionQueue.ts", "src/components/team/TVSetupInline.tsx"]) {
      expect(read(f), `${f} still reads CATEGORY_ID_TO_ICON directly`)
        .not.toMatch(/CATEGORY_ID_TO_ICON\[/);
    }
  });

  it("seeds a queue row from the column", () => {
    expect(read("src/hooks/useTVSessionQueue.ts")).toMatch(/categoryIconSlugSync\(roomInfo\.category_id\)/);
    expect(read("src/components/team/TVSetupInline.tsx")).toMatch(/categoryIconSlugSync\(roomData\.category_id\)/);
  });
});

describe("the snapshot and the column can be checked against each other", () => {
  it("ships a script that says when the map has drifted", () => {
    const script = read("scripts/sync-category-icons.mjs");
    expect(script).toMatch(/--check/);
    expect(script).toMatch(/select=category_id,icon_slug/);
  });
});
