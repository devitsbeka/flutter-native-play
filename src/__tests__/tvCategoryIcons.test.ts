import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { categoryIconCandidates, categoryIconSlugSync, categoryNameSync } from "@/hooks/useCategoryDisplay";
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
    expect(sel).toMatch(/const \{ iconSlugFor, nameFor \} = useCategoryDisplay\(\);/);
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

/**
 * And the same for what a category is CALLED.
 *
 * The queue stored the name it was handed when the round was added and drew
 * it for ever after, so "Celebrities" sat in the round list above a Discover
 * card reading "ცნობილი ადამიანები". Same shape as the icon: a snapshot
 * standing in for something that should be resolved at render.
 *
 * `categories.name` is the GEORGIAN name for every row — the localised ones
 * live in category_translations, keyed by categories.id. So the picker was
 * showing Georgian names to English readers too, straight from its own query.
 */
describe("what a category is called", () => {
  const sel = read("src/components/controller/ControllerDirectSelection.tsx");

  it("resolves the queue row's title at render", () => {
    expect(sel).toMatch(/nameFor\(item\.category_id, item\.category_name\)/);
  });

  it("resolves the picker's titles the same way", () => {
    // Its own query returns categories.name, which is Georgian regardless of
    // who is reading.
    expect(sel).toMatch(/nameFor\(category\.category_id, category\.name\)/);
  });

  it("keeps the stored name for anything that is not a category", () => {
    // A user trivia has a real title of its own; translating or replacing it
    // would be inventing a name for someone else's quiz.
    expect(categoryNameSync(null, "My own quiz")).toBe("My own quiz");
    expect(categoryNameSync(undefined, "My own quiz")).toBe("My own quiz");
  });

  it("falls back to the snapshot for a category it has never heard of", () => {
    expect(categoryNameSync("not_a_real_category", "Whatever it said")).toBe("Whatever it said");
  });

  it("reads Georgian straight off the row, with no overlay", () => {
    // categories.name IS the Georgian name — the same rule useCategories
    // follows, and the reason `ka` skips the translations query entirely.
    const hook = read("src/hooks/useCategoryDisplay.ts");
    expect(hook).toMatch(/if \(lang === "ka"\) return facts\.nameKa/);
    expect(hook).toMatch(/if \(lang === "ka" \|\| namesByLang\.has\(lang\)\) return;/);
  });

  it("keys the overlay by uuid, which is what the table references", () => {
    const hook = read("src/hooks/useCategoryDisplay.ts");
    expect(hook).toMatch(/namesByLang\.get\(lang\)\?\.get\(facts\.uuid\)/);
  });

  it("re-resolves when the reader changes language", () => {
    const hook = read("src/hooks/useCategoryDisplay.ts");
    expect(hook).toMatch(/\}, \[lang\]\);/);
  });
});
