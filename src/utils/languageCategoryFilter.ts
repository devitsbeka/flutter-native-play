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
  return rows.filter((r) => !r.is_language_specific || r.language === lang);
}
