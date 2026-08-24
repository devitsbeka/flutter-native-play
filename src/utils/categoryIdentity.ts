/**
 * Which category a room is playing, given that rooms do not agree on how to
 * say it.
 *
 * `categories` carries two ids: `id` (a uuid) and `category_id` (the ASCII
 * slug — "guess_city", "geography"). Different room-start paths have written
 * different ones into `game_rooms.category_id` over time, and both are live in
 * the table right now: two rooms playing the same category, one holding
 * "guess_city" and one holding "6fa574e2-c61e-5ac2-bf17-85f742804238".
 *
 * Everything that draws a category icon is keyed on the slug —
 * CATEGORY_ID_TO_ICON, POPULAR_IMAGE_CATEGORY_IDS. Handed a uuid they all
 * miss, and DynamicIcon's last resort is a *random* icon picked from a hash of
 * whatever it was given, which is stable per room and unrelated to the
 * subject. That is how "guess the city" came to be illustrated with a banana.
 *
 * So resolve through the category row and take its real `icon_slug`, rather
 * than inferring an icon from an id whose format is not guaranteed.
 */

export interface CategoryRowIdentity {
  id: string;
  category_id: string;
  icon_slug: string | null;
}

export interface CategoryIdentity {
  /** The ASCII slug, which is what the icon maps are keyed on. */
  categoryId: string | null;
  /** `categories.icon_slug` — the icon library's own name for the picture. */
  iconSlug: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string | null | undefined): boolean {
  return UUID_RE.test(value ?? "");
}

/**
 * Resolve a room's stored category id into the slug and icon slug.
 *
 * Matches on either column, so it does not need to know which format it was
 * handed. With no rows loaded yet it passes a slug straight through — that is
 * what the icon maps already understand — and refuses to guess for a uuid,
 * because a uuid reaching DynamicIcon is precisely what produces a random
 * icon. Better a missing picture for a moment than a confidently wrong one.
 */
export function resolveCategoryIdentity(
  raw: string | null | undefined,
  rows: CategoryRowIdentity[] | null | undefined,
): CategoryIdentity {
  if (!raw) return { categoryId: null, iconSlug: null };

  const row = rows?.find((r) => r.id === raw || r.category_id === raw);
  if (row) {
    return { categoryId: row.category_id, iconSlug: row.icon_slug };
  }

  if (looksLikeUuid(raw)) return { categoryId: null, iconSlug: null };
  return { categoryId: raw, iconSlug: null };
}
