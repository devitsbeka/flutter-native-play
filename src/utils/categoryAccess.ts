/**
 * What a category costs to play, in one place.
 *
 * Three tiers, and every screen that gates anything reads them from here:
 *
 *   free      the picture-guess categories. Open to everyone, every level,
 *             signed in or not. They are the shop window — the thing a
 *             player meets first and the reason they come back — so they
 *             are never the thing a paywall interrupts.
 *   standard  everything else. One level without a subscription; the rest
 *             is what PRO buys.
 *   premium   a curated nine. Locked outright without PRO, not even a
 *             taste, and drawn with a lock rather than a progress bar.
 *
 * This used to be spread across three files that disagreed. The level grid
 * had a flat "3 free levels per category" constant, the Explore tabs
 * filtered on an `is_premium` column that named the guess categories as the
 * premium ones — the exact opposite of the intent — and nothing connected
 * either to what a card drew. A player could therefore see a lock on a
 * category the grid would happily let them play, and vice versa.
 */

/**
 * Open to everyone, all the way down.
 *
 * Matched on the slug rather than a column, because these five are the
 * product's front door and a database that hasn't had its migrations run
 * must not be able to close it. `guess_movie` is listed even though no
 * environment currently carries the row: if it ever arrives it arrives free,
 * and finding that out from a paywall would be the wrong way round.
 */
export const FREE_CATEGORY_IDS = [
  "guess_celebrity",
  "guess_city",
  "guess_flag",
  "guess_logo",
  "guess_movie",
  "guess_sportsman",
] as const;

/**
 * The premium nine, as the client believes them.
 *
 * `categories.is_premium` is the authority — see `categoryTier` — but that
 * column arrives with a migration, and migrations here reach the database
 * through Lovable rather than through a deploy. Two of them have been
 * sitting on `main` unapplied for a fortnight. A client that could only
 * learn what is premium from an unapplied column would ship this feature
 * switched off and nobody would know until somebody asked why nothing was
 * locked.
 *
 * So: the column when it exists, this list when it does not. The migration
 * sets exactly these nine, and `categoryAccess.test.ts` fails if the two
 * ever drift apart.
 */
export const PREMIUM_CATEGORY_IDS = [
  "art",
  "celebrities",
  "fun_facts",
  "movies",
  "politics",
  "programming",
  "science",
  "space",
  "video_games",
] as const;

const FREE = new Set<string>(FREE_CATEGORY_IDS);
const PREMIUM = new Set<string>(PREMIUM_CATEGORY_IDS);

export type CategoryTier = "free" | "standard" | "premium";

/** The two shapes a category arrives in — Discover's slug-as-id, and the
 *  room library's uuid-as-id with the slug alongside. Either identifies it. */
export interface AccessCategory {
  id?: string | null;
  category_id?: string | null;
  /** From the database when the column is there; undefined before that. */
  isPremium?: boolean | null;
}

/** The slug, whichever field is carrying it. */
function slugOf(category: AccessCategory): string {
  return category.category_id || category.id || "";
}

export function categoryTier(category: AccessCategory): CategoryTier {
  const slug = slugOf(category);
  // Free wins over premium, always. If a future migration ever marks a
  // guess category premium — as the last one did, which is what started
  // this — the front door stays open and the mistake is visible in the tab
  // counts rather than in a locked category nobody can play.
  if (FREE.has(slug)) return "free";
  if (category.isPremium === true) return "premium";
  if (category.isPremium === false) return "standard";
  return PREMIUM.has(slug) ? "premium" : "standard";
}

/**
 * Levels playable without a subscription. Infinity is not a cop-out here:
 * it is the honest answer for a free category and it makes every caller a
 * plain `level <= allowance` comparison instead of a special case.
 */
export function freeLevelAllowance(tier: CategoryTier): number {
  switch (tier) {
    case "free":
      return Number.POSITIVE_INFINITY;
    case "premium":
      return 0;
    default:
      return 1;
  }
}

/** The whole category is shut, so the card draws a lock and the grid never
 *  offers a first level. Only premium does this; standard still gives one. */
export function isCategoryLocked(category: AccessCategory, isVip: boolean): boolean {
  if (isVip) return false;
  return categoryTier(category) === "premium";
}

/** Levels this player may open in this category. */
export function playableLevels(category: AccessCategory, isVip: boolean): number {
  if (isVip) return Number.POSITIVE_INFINITY;
  return freeLevelAllowance(categoryTier(category));
}
