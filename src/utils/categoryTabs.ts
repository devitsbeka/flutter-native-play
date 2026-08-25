import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * The tabs that sort a wall of categories into something findable, and the
 * rules behind each one.
 *
 * Discover has had these for months. The room's library — the same wall of
 * categories, reached when adding a round to play — had a search box and
 * nothing else, so finding the category you play every week meant either
 * typing its name or scrolling seventy tiles. Two screens showing the same
 * things ought to sort them the same way.
 *
 * The rules live here rather than in either screen because that is what
 * keeps them the same rules. Both callers were going to grow their own copy
 * of "what counts as popular" otherwise, and copies drift.
 */
export type CategoryTabId =
  | "all"
  | "favorites"
  | "recently_viewed"
  | "popular"
  | "classic"
  | "fun"
  | "educational";

/** Where the recently-viewed list is kept. Written by the category page. */
export const RECENTLY_VIEWED_KEY = "recentlyViewedCategories";

/**
 * Category ids the player has opened lately, newest first.
 *
 * localStorage can throw outright — a private window, a browser set to block
 * site data — and the value can be anything, since nothing stops a person
 * editing it. Neither is a reason for a tab to take the screen down, so both
 * end as an empty list.
 */
export function readRecentlyViewedIds(): string[] {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

interface TabCategory {
  id: string;
  /**
   * The slug — "guess_logo", "movies" — where the row carries one.
   *
   * Two callers, two shapes. useCategories maps `id` to the slug for
   * backwards compatibility, so Discover's ids ARE slugs; the room's library
   * queries `categories` directly, where `id` is the uuid and the slug sits
   * in `category_id`. The curated lists below are written in slugs, so
   * matching on `id` alone found nothing in the library and its Popular tab
   * said "no categories" while Discover's showed twelve.
   */
  category_id?: string | null;
  type?: string | null;
}

/** Both keys, so a curated slug finds the row whichever shape it arrives in. */
function indexByIdAndSlug<T extends TabCategory>(categories: T[]): Map<string, T> {
  const byKey = new Map<string, T>();
  for (const category of categories) {
    byKey.set(category.id, category);
    if (category.category_id) byKey.set(category.category_id, category);
  }
  return byKey;
}

/**
 * Popular is a curated order, not a measured one.
 *
 * The six picture-guess categories front it. Until their migration has run in
 * a given environment they are simply not in `categories`, so the curated
 * fallback stands in rather than the row rendering empty.
 */
const POPULAR_FALLBACK_IDS = [
  "movies", "tv_series", "music", "sports", "world_history", "geography",
  "science", "pop_culture", "video_games", "celebrities", "animals", "fun_facts",
];

export function orderByPopularity<T extends TabCategory>(categories: T[]): T[] {
  const byKey = indexByIdAndSlug(categories);
  const pictureGuess = POPULAR_IMAGE_CATEGORY_IDS
    .map((id) => byKey.get(id))
    .filter((c): c is T => Boolean(c));
  if (pictureGuess.length > 0) return pictureGuess;
  return POPULAR_FALLBACK_IDS.map((id) => byKey.get(id)).filter((c): c is T => Boolean(c));
}

/**
 * The categories a tab shows, in the order it shows them.
 *
 * "all" is everything untouched — including its existing sort — because the
 * default view is the one people scroll by shape, and reordering it would
 * move every tile they had learned the position of.
 */
export function filterCategoriesByTab<T extends TabCategory>(
  categories: T[],
  tab: CategoryTabId,
  options: { favorites?: Set<string>; recentIds?: string[] } = {}
): T[] {
  switch (tab) {
    case "all":
      return categories;

    case "favorites":
      return options.favorites ? categories.filter((c) => options.favorites!.has(c.id)) : [];

    case "recently_viewed": {
      // Newest first, which is the order the ids are stored in — so this maps
      // over the ids rather than filtering the categories.
      const recent = options.recentIds ?? readRecentlyViewedIds();
      const byId = new Map(categories.map((c) => [c.id, c]));
      return recent.map((id) => byId.get(id)).filter((c): c is T => Boolean(c));
    }

    case "popular":
      return orderByPopularity(categories);

    default:
      // classic / fun / educational are the category's own type.
      return categories.filter((c) => c.type === tab);
  }
}
