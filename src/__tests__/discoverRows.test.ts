import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { funRowCategories, isPopularRowCategory } from "@/utils/discoverRows";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * Discover must not show the same category twice.
 *
 * Measured against the 71 live categories: the six picture-guess ones are
 * `type = "fun"` in the database, and they are also exactly what the Popular
 * row is built from. Both rows are on the "all" tab, a few hundred pixels
 * apart, so the same six cards appeared twice on one screen.
 */
const cat = (id: string, type: string) => ({ id, type });

describe("the Fun row", () => {
  it("drops the categories Popular already features", () => {
    const all = [
      cat("guess_logo", "fun"),
      cat("music", "fun"),
      cat("guess_flag", "fun"),
      cat("animals", "fun"),
    ];
    expect(funRowCategories(all).map((c) => c.id)).toEqual(["music", "animals"]);
  });

  it("keeps every non-popular fun category", () => {
    const all = POPULAR_IMAGE_CATEGORY_IDS.map((id) => cat(id, "fun"));
    expect(funRowCategories(all)).toEqual([]);
  });

  it("leaves classic and educational alone", () => {
    const all = [cat("world_history", "classic"), cat("science", "educational")];
    expect(funRowCategories(all)).toEqual([]);
    // ...and neither is claimed by Popular
    expect(isPopularRowCategory("world_history")).toBe(false);
    expect(isPopularRowCategory("science")).toBe(false);
  });

  it("preserves the order it was given", () => {
    // The list arrives sorted by sort_order and the row relies on it.
    const all = [cat("c", "fun"), cat("a", "fun"), cat("b", "fun")];
    expect(funRowCategories(all).map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate its input", () => {
    const all = [cat("guess_logo", "fun"), cat("music", "fun")];
    funRowCategories(all);
    expect(all).toHaveLength(2);
  });
});

/**
 * The category list must not drag the whole icon library in front of the
 * page's own queries.
 *
 * `fetchCategories` used to fire `new Image()` for every category with an
 * icon_slug — 51 of the 71 live rows — the moment the list arrived. The icon
 * library is served from the same origin as the REST API, so those requests
 * queue against the queries Discover is still waiting on, and all of them
 * land before a single card is on screen. Measured in a browser against the
 * real category list: 88 icon requests before any scrolling, 42 without it.
 *
 * Cards request their own icons as they render, which is what makes the
 * preload redundant rather than merely early.
 */
describe("fetching the category list", () => {
  const source = readFileSync(join(process.cwd(), "src/hooks/useCategories.ts"), "utf8");

  it("does not preload every category icon", () => {
    expect(
      source,
      "a blanket preload here competes with Discover's own queries on the same origin"
    ).not.toMatch(/preloadIcons/);
  });
});
