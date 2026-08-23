import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * Which categories belong in each Discover row.
 *
 * The rows are cut from one list by `type`, which almost works. The six
 * picture-guess categories are `type = "fun"` in the database *and* are what
 * the Popular row is made of, so they rendered twice on the same screen — six
 * identical cards a few hundred pixels apart, which reads as the page having
 * glitched rather than as a deliberate feature placement.
 *
 * Popular is the placement; Fun shows what Popular is not already showing.
 * Classic and Educational are untouched — no category is in both.
 */
export interface RowCategory {
  id: string;
  type?: string;
}

/** True for a category the Popular row already features. */
export function isPopularRowCategory(id: string): boolean {
  return (POPULAR_IMAGE_CATEGORY_IDS as readonly string[]).includes(id);
}

/**
 * The Fun row: everything of type "fun" that Popular is not already showing.
 *
 * Order is preserved — the list arrives sorted by `sort_order` and the row
 * relies on that.
 */
export function funRowCategories<T extends RowCategory>(categories: T[]): T[] {
  return categories.filter((c) => c.type === "fun" && !isPopularRowCategory(c.id));
}
