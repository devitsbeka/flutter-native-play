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

  it("finds the curated categories whether id is the slug or the uuid", () => {
    // Two callers, two shapes. Discover's ids ARE slugs (useCategories maps
    // category_id onto id); the library queries `categories` directly, where
    // id is a uuid and the slug is in category_id. Matching on id alone found
    // nothing there, so the library's Popular tab read "no categories" while
    // Discover's showed six.
    const rows = [
      { id: "8f1c...", category_id: "guess_logo" },
      { id: "2b7e...", category_id: "guess_flag" },
      { id: "0c3a...", category_id: "obscure" },
    ];
    expect(orderByPopularity(rows).map((c) => c.category_id))
      .toEqual(["guess_logo", "guess_flag"]);  // curated order, not input order
  });

  it("puts the party categories first when they are present", () => {
    // "Most Likely To" is the room game the Popular row leads with — first
    // card in Discover's Popular and in the pickers' Popular tab alike.
    const rows = [
      { id: "8f1c...", category_id: "guess_logo" },
      { id: "9a2d...", category_id: "most_likely_to" },
      { id: "2b7e...", category_id: "guess_flag" },
    ];
    expect(orderByPopularity(rows).map((c) => c.category_id))
      .toEqual(["most_likely_to", "guess_logo", "guess_flag"]);
    // And ahead of the fallback list too, in a pre-migration environment.
    expect(orderByPopularity([{ id: "movies" }, { id: "most_likely_to" }]).map((c) => c.id))
      .toEqual(["most_likely_to", "movies"]);
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

  it("lets the tab strip run to the sheet's edges", () => {
    // It is a horizontal scroller: a pill mid-scroll should be cut by the
    // edge rather than stopping short inside the padding.
    //
    // 8px, and the number matters. GameModal pads children by 24px (px-6)
    // and IconTabBar bleeds itself by 16px already, so -mx-2 is what lands
    // the strip exactly on the sheet's edge. It was -mx-5, which overshot by
    // 12px a side; the body scrolls vertically, so its overflow-x computes
    // to auto and the whole sheet scrolled sideways.
    expect(modal).toMatch(/\{\/\* Tabs[\s\S]{0,700}?<div className="-mx-2 mb-2">/);
  });

  it("keeps Mixed to the unfiltered view", () => {
    // It has no type, cannot be favourited and is never recently viewed.
    expect(modal).toMatch(/if \(activeTab !== "all"\) return false;/);
  });
});

describe("the room's category picker", () => {
  const picker = read("src/components/team/CategoryPickerModal.tsx");

  it("has the tabs too", () => {
    // Two screens, the same wall of categories: one when a host adds a round,
    // one everywhere else. Only the other could sort it, so reaching a
    // favourite from inside a room meant typing its name or scrolling
    // seventy tiles.
    expect(picker).toMatch(/<IconTabBar/);
    expect(picker).toMatch(/const inTab = filterCategoriesByTab\(/);
  });

  it("carries the slug under the name the tab rules read", () => {
    // This file renames category_id to categoryId for the artwork override.
    // The curated lists are written in slugs and looked up by category_id, so
    // without both Popular here would be as empty as the library's was.
    expect(picker).toMatch(/category_id: d\.category_id/);
    expect(picker, "type tabs filter on it").toMatch(/type: d\.type/);
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
 * The lobby header: the room's name centred, at every width.
 *
 * It used to be left-aligned on a phone and centred only from md up, on the
 * grounds that a Georgian name centred between three buttons ellipsises. It
 * does — so the name is a size down from the page titles now — but the King
 * and Battle lounges centre theirs, and a room whose title hangs off the
 * back arrow was the odd one out of the three.
 */
describe("the room title in the lobby header", () => {
  const lobby = read("src/components/team/RoomLobbyV2.tsx");
  const universal = read("src/components/lobby/UniversalLobby.tsx");

  it("is the universal lobby's title, set over the blurred scene", () => {
    // One lobby for every mode now (Figma 1018:5815): the classic room
    // passes its name in rather than drawing a header of its own.
    expect(lobby).toMatch(/roomName=\{roomName\}/);
    // 34/40, not the frame's 52/62: the title shares its row with the
    // room's icon now, and at 52 a Georgian name broke under it and left
    // the icon sitting on a line of its own (owner's ask to save space).
    expect(universal).toMatch(/font-hero text-\[34px\] capitalize leading-\[40px\]/);
    expect(universal).toMatch(/line-clamp-2/);
  });

  it("is the host's way in to rename, and a guest's plain title", () => {
    expect(lobby).toMatch(/onRename=\{isHost \? \(\) => setShowIconPicker\(true\) : undefined\}/);
  });

  it("does not stretch the back button itself", () => {
    // The back arrow is a 40px round button at the header's left, never a
    // flex-1 wrapper that would give it a very wide tinted box.
    expect(universal).toMatch(/onClick=\{onBack\}\s*\n\s*className="rounded-full p-2/);
  });
});

describe("the classic lobby's create controls (owner's asks)", () => {
  const lobby = read("src/components/team/RoomLobbyV2.tsx");
  const universal = read("src/components/lobby/UniversalLobby.tsx");

  it("the host picks the player count 2–10 from a dropdown", () => {
    expect(lobby).toMatch(/\[2, 3, 4, 5, 6, 7, 8, 9, 10\]\.map/);
    expect(lobby).toMatch(/variant: "dropdown" as const/);
    expect(lobby).toMatch(/void setMaxPlayers\(v\)/);
    expect(lobby).toMatch(/max_players: n/);
    // The dropdown variant renders a real <select>, and the static "1–10"
    // line stands down when a players picker is present.
    expect(universal).toMatch(/function RuleDropdown/);
    expect(universal).toMatch(/!rules\.some\(\(r\) => r\.key === "players"\)/);
  });

  it("Play on TV is a row in the rules, not a chip beside the category", () => {
    // It used to sit up top next to the category; the top row is the
    // category chip + the add button now.
    expect(universal).toMatch(/\{tv && \(\s*\n\s*<LobbyInfoRow label=\{tv\.label\} onPress=\{tv\.onPress\}>/);
    expect(universal).not.toMatch(/<Chip icon=\{chipTv\}/);
  });

  it("the category has a + to queue rounds, which scroll under it with a count", () => {
    expect(universal).toMatch(/category\.onAdd && \(/);
    expect(universal).toMatch(/overflow-x-auto scrollbar-hide/);
    expect(universal).toMatch(/category\.roundsLabel/);
    expect(lobby).toMatch(/onAdd: isHost \?/);
    expect(lobby).toMatch(/uRoundsSelected/);
  });
});
