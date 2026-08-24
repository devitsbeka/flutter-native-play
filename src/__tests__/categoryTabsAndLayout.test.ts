import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { filterCategoriesByTab, orderByPopularity, readRecentlyViewedIds } from "@/utils/categoryTabs";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * The room's library and Discover show the same wall of categories through
 * different doors. Discover has had tabs for months; the library had a search
 * box and seventy tiles, so finding the category you play every week meant
 * typing its name or scrolling for it.
 *
 * The rules now live in one module, because both screens were otherwise going
 * to grow their own idea of "popular".
 */
describe("sorting a wall of categories", () => {
  const cats = [
    { id: "movies", type: "fun" },
    { id: "science", type: "educational" },
    { id: "guess_flag", type: "classic" },
    { id: "obscure", type: "educational" },
  ];

  it("leaves the default view exactly as it was", () => {
    // "all" keeps the server's sort_order. Reordering the default would move
    // every tile somebody had learned the position of.
    expect(filterCategoriesByTab(cats, "all")).toEqual(cats);
  });

  it("shows only what has been favourited", () => {
    const favorites = new Set(["science", "movies"]);
    expect(filterCategoriesByTab(cats, "favorites", { favorites }).map((c) => c.id))
      .toEqual(["movies", "science"]);
  });

  it("shows nothing rather than everything when favourites are unknown", () => {
    // The hook is async. Falling back to the full list would flash the whole
    // library under a tab that says Favourites.
    expect(filterCategoriesByTab(cats, "favorites")).toEqual([]);
  });

  it("keeps recently-viewed in the order it was viewed", () => {
    // Newest first, which is the order the ids are stored in — so it maps
    // over the ids rather than filtering the categories.
    const recentIds = ["science", "movies"];
    expect(filterCategoriesByTab(cats, "recently_viewed", { recentIds }).map((c) => c.id))
      .toEqual(["science", "movies"]);
  });

  it("drops recently-viewed ids for categories that no longer exist", () => {
    const recentIds = ["deleted_category", "movies"];
    expect(filterCategoriesByTab(cats, "recently_viewed", { recentIds }).map((c) => c.id))
      .toEqual(["movies"]);
  });

  it("filters classic, fun and educational by the category's own type", () => {
    expect(filterCategoriesByTab(cats, "educational").map((c) => c.id))
      .toEqual(["science", "obscure"]);
    expect(filterCategoriesByTab(cats, "fun").map((c) => c.id)).toEqual(["movies"]);
  });

  it("falls back to the curated list when the picture-guess set is absent", () => {
    // Those categories arrive with a migration. Until it has run in a given
    // environment they are simply not there, and Popular must not be empty.
    const withoutPictureGuess = [{ id: "movies" }, { id: "science" }, { id: "nothing" }];
    expect(orderByPopularity(withoutPictureGuess).map((c) => c.id)).toEqual(["movies", "science"]);
  });

  it("survives localStorage being unreadable", () => {
    // A private window, or a browser set to block site data, throws on the
    // accessor itself. A tab is not worth taking the screen down for.
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("blocked"); },
    });
    expect(readRecentlyViewedIds()).toEqual([]);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  });
});

describe("the library modal", () => {
  const modal = read("src/components/team/CategorySelectorModal.tsx");

  it("has the tabs, and the same ones Discover has", () => {
    expect(modal).toMatch(/<IconTabBar/);
    for (const key of ["discover.all", "discover.favorites", "discover.recentlyViewedTab", "discover.popularTab"]) {
      expect(modal, `${key} is missing from the library's tabs`).toContain(key);
    }
  });

  it("asks for the column the type tabs filter on", () => {
    // classic/fun/educational are the category's own type, and the query used
    // to leave it out — the tabs would have been silently empty.
    expect(modal).toMatch(/select\("[^"]*\btype\b/);
  });

  it("searches within the tab, not across everything", () => {
    // You picked Favourites for a reason; a search that ignored it would
    // answer a question nobody asked.
    expect(modal).toMatch(/const inTab = filterCategoriesByTab\(/);
    expect(modal).toMatch(/return inTab\.filter\(/);
  });

  it("keeps Mixed to the unfiltered view", () => {
    // It has no type, cannot be favourited and is never recently viewed.
    expect(modal).toMatch(/if \(activeTab !== "all"\) return false;/);
  });
});

describe("Discover and the library share one rule", () => {
  const discover = read("src/pages/Discover.tsx");

  it("Discover reads popularity from the shared module", () => {
    expect(discover).toMatch(/orderByPopularity\(categories\)/);
    expect(discover, "a second copy of the popular list is a second list to update")
      .not.toMatch(/POPULAR_IMAGE_CATEGORY_IDS/);
  });

  it("both name the storage key once", () => {
    expect(discover).toMatch(/RECENTLY_VIEWED_KEY/);
    expect(discover, "a typed-out key in one place and a constant in the other is how they diverge")
      .not.toMatch(/"recentlyViewedCategories"/);
  });
});

/**
 * The icon sheet is opened to rename a room at least as often as to re-skin
 * one, and the name sat below a search box and a row of category chips — the
 * third thing on screen, below the fold on a short phone. The search filters
 * the icon grid; it belongs with what it filters.
 */
describe("the room icon and name sheet", () => {
  const sheet = read("src/components/team/RoomIconPickerModal.tsx");

  it("puts the name above the search", () => {
    const nameAt = sheet.indexOf("ripEditHint");
    const searchAt = sheet.indexOf("ripSearchPlaceholder");
    expect(nameAt).toBeGreaterThan(-1);
    expect(searchAt).toBeGreaterThan(-1);
    expect(nameAt, "the room's name must come before the icon search").toBeLessThan(searchAt);
  });

  it("keeps the name out of the scrolling area", () => {
    // Below the search it also scrolled away from the thing being renamed.
    const scrollerAt = sheet.indexOf("{/* Scrollable Content */}");
    expect(sheet.indexOf("ripEditHint")).toBeLessThan(scrollerAt);
  });
});

/**
 * The lobby header: left-aligned on a phone, centred from md up.
 */
describe("the room title in the lobby header", () => {
  const lobby = read("src/components/team/RoomLobbyV2.tsx");

  it("centres itself only where there is width for it", () => {
    // A Georgian room name centred in the ~200px between three buttons is an
    // ellipsis with space either side of it.
    expect(lobby).toMatch(/md:flex-\[2\] md:justify-center/);
  });

  it("gives both sides an equal share, so the middle is the middle", () => {
    // Centring within the leftover space puts the title ~18px off, because
    // the actions cluster is wider than the back button. Measured at 768px
    // and 1280px, the equal-share version lands exactly on centre.
    const md1 = (lobby.match(/md:flex-1/g) ?? []).length;
    expect(md1, "the back button's wrapper and the actions cluster").toBe(2);
  });

  it("does not stretch the back button itself", () => {
    // flex-1 on the button would give the arrow a very wide tinted box.
    expect(lobby).toMatch(/<div className="flex shrink-0 items-center md:flex-1">\s*<motion\.button\s*\n\s*onClick=\{handleExitRoom\}/);
  });
});
