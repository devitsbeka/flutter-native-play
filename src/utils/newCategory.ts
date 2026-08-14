/**
 * Which categories are actually new.
 *
 * The "New!" badge used to mean "this category has more levels than it did
 * the last time you opened it", which is true of a category that has existed
 * for a year and quietly gained a level — so the badge sat on old categories
 * and said nothing a player could act on. It marks a genuinely new category
 * now: one added to the app within the last two weeks.
 *
 * Two ways it goes away, so it can never get stuck: the window closes for
 * everyone, or the player opens the category and it closes for them.
 */

/** How long a category counts as new after it is created. */
export const NEW_CATEGORY_DAYS = 14;

export interface CategoryFreshness {
  id: string;
  /** When the category was added. Null for rows that predate the column. */
  createdAt: string | null;
}

export function isWithinNewWindow(createdAt: string | null, now: number): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  const age = now - created;
  // A created_at in the future is a clock or seeding artefact, not a brand
  // new category — treat it as new rather than as impossibly old.
  return age < NEW_CATEGORY_DAYS * 86_400_000;
}

/**
 * The categories to badge: created recently, and not yet opened by this
 * player. `seen` holds the ids they have already been to.
 */
export function newCategoryIds(
  categories: CategoryFreshness[],
  seen: Set<string>,
  now: number,
): Set<string> {
  const fresh = new Set<string>();
  for (const category of categories) {
    if (seen.has(category.id)) continue;
    if (isWithinNewWindow(category.createdAt, now)) fresh.add(category.id);
  }
  return fresh;
}
