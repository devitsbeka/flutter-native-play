import { describe, it, expect } from "vitest";
import { NEW_CATEGORY_DAYS, isWithinNewWindow, newCategoryIds } from "@/utils/newCategory";

const NOW = Date.parse("2026-08-14T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

describe("what counts as a new category", () => {
  it("badges a category added inside the window", () => {
    expect(isWithinNewWindow(daysAgo(1), NOW)).toBe(true);
    expect(isWithinNewWindow(daysAgo(NEW_CATEGORY_DAYS - 1), NOW)).toBe(true);
  });

  it("stops once the window closes", () => {
    expect(isWithinNewWindow(daysAgo(NEW_CATEGORY_DAYS), NOW)).toBe(false);
    expect(isWithinNewWindow(daysAgo(365), NOW)).toBe(false);
  });

  it("says no when the category has no creation date", () => {
    // Rows that predate the column. Silence is the right answer — the badge
    // used to appear on categories that had existed for a year.
    expect(isWithinNewWindow(null, NOW)).toBe(false);
    expect(isWithinNewWindow("not a date", NOW)).toBe(false);
  });

  it("treats a future date as new rather than as impossibly old", () => {
    // Clock skew or seeding, not a category from next month.
    expect(isWithinNewWindow(new Date(NOW + 86_400_000).toISOString(), NOW)).toBe(true);
  });

  it("drops the badge for a category the player has opened", () => {
    const categories = [
      { id: "fresh", createdAt: daysAgo(2) },
      { id: "fresh-but-seen", createdAt: daysAgo(2) },
      { id: "old", createdAt: daysAgo(200) },
    ];
    expect(newCategoryIds(categories, new Set(["fresh-but-seen"]), NOW)).toEqual(new Set(["fresh"]));
  });

  it("badges nothing when nothing was added recently", () => {
    // The state the app is in most of the time, and the state the screenshot
    // should have been in: no "New!" anywhere.
    const categories = [
      { id: "a", createdAt: daysAgo(90) },
      { id: "b", createdAt: daysAgo(365) },
      { id: "c", createdAt: null },
    ];
    expect(newCategoryIds(categories, new Set(), NOW).size).toBe(0);
  });

  it("does not care how many levels a category has", () => {
    // The old rule keyed off level count, so adding a level to a two-year-old
    // category lit its badge up. Nothing here can see a level count.
    const categories = [{ id: "old-with-new-levels", createdAt: daysAgo(400) }];
    expect(newCategoryIds(categories, new Set(), NOW).size).toBe(0);
  });
});
