import { readAppLanguage } from "@/utils/appLanguage";

export interface LanguageScopedCategoryRow {
  is_language_specific?: boolean | null;
  language?: string | null;
}

/**
 * Language-specific categories (Spanish Cuisine, Georgian History, ...) exist
 * only for readers whose app language matches the category's `language`.
 * Everything else is universal and shows for everyone.
 *
 * Every list of categories offered to a user must pass through this filter.
 * useCategories applies it for the main grids; the direct fetchers (room
 * library picker, TV/controller pickers, random-category pools) call this —
 * skipping it is how a German user ends up staring at "Cocina española".
 */
export function filterCategoriesForLanguage<T extends LanguageScopedCategoryRow>(
  rows: T[],
  lang: string = readAppLanguage("en"),
): T[] {
  return rows.filter((r) => categoryPlayableIn(r, lang));
}

/**
 * The same rule for ONE category — what a room's held or queued round has
 * to pass before Start, and what a public room's rounds have to pass before
 * the room is listed.
 *
 * The pickers have always filtered, but a round is stored on the room, and
 * the room outlives the choice: an account that picked a country whose
 * language is Georgian, set a room on Georgian Cuisine, then moved to the
 * USA, came back to a lobby holding a round with no English questions in
 * it. Start failed with "questions not found" and nothing said why (owner:
 * "Georgian cuisine should see only users who picked Georgia in settings,
 * we need strict rules").
 */
export function categoryPlayableIn(row: LanguageScopedCategoryRow, lang: string): boolean {
  return !row.is_language_specific || row.language === lang;
}
