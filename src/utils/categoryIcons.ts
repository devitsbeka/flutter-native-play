import { supabase } from "@/integrations/supabase/client";
import { UNDECIDED_ICON_SLUG } from "@/utils/undecidedRound";

/**
 * The icons a room may NOT wear: every one a category wears.
 *
 * A room's face and a category's face are read the same way on the same
 * card — the room's icon beside its name, the round's category icon beside
 * the round — so a room wearing a category's icon says it IS that
 * category. "დეტექტივები" wore the mystery box, which is what every
 * undecided round wears; "კოსმიური კლანი" wore the astronaut, which is
 * Astronomy's (owner: "we shouldn't use icons on rooms if we use that icon
 * in our category library, check").
 *
 * The dealt pool struck category icons already (utils/roomCrests); the
 * other three ways a room gets an icon did not — the name generator's
 * pick, the host's own pick in the icon sheet, and the mystery box, which
 * no category row names but every random round wears. This is the one
 * list all of them read, and the migration of the same name is the same
 * rule in the database, for whatever writes the column next.
 */

/** Library slugs no category names that are still a category's face. */
export const RESERVED_CATEGORY_ICON_SLUGS: readonly string[] = [UNDECIDED_ICON_SLUG];

/**
 * The library slug inside an icon URL, or null when it is not a library
 * icon. Every library icon is `…/icon-library/<slug>.<ext>`, sometimes
 * with a cache-buster after it.
 */
export function iconSlugFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /\/icon-library\/([^/?#]+?)\.[A-Za-z0-9]+(?:[?#]|$)/.exec(url);
  return m ? m[1] : null;
}

let categoryIconSlugs: Promise<Set<string>> | null = null;

/**
 * Every slug a category wears, fetched once per session. The reserved
 * slugs are always in it; a failed fetch still returns those, so the rule
 * degrades to "not the mystery box" rather than to nothing.
 */
export function fetchCategoryIconSlugs(): Promise<Set<string>> {
  if (!categoryIconSlugs) {
    categoryIconSlugs = (async () => {
      const slugs = new Set<string>(RESERVED_CATEGORY_ICON_SLUGS);
      try {
        const { data } = await supabase.from("categories").select("icon_slug, icon");
        (data ?? []).forEach((c) => {
          if (c.icon_slug) slugs.add(String(c.icon_slug));
          if (c.icon) slugs.add(String(c.icon));
        });
      } catch {
        // The reserved slugs still apply.
      }
      return slugs;
    })();
  }
  return categoryIconSlugs;
}

/** Does a category wear this icon? */
export function isCategoryIcon(
  icon: { slug?: string | null; icon_url?: string | null } | string | null | undefined,
  slugs: ReadonlySet<string>,
): boolean {
  if (!icon) return false;
  const slug = typeof icon === "string" ? iconSlugFromUrl(icon) : icon.slug ?? iconSlugFromUrl(icon.icon_url);
  return !!slug && slugs.has(slug);
}

/**
 * An icon URL a room may wear, or null when a category wears it — null is
 * "no icon of its own", and every card then deals the room one from the
 * pool (utils/roomCrests), which never holds a category's.
 */
export async function roomIconOrNull(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  return isCategoryIcon(url, await fetchCategoryIconSlugs()) ? null : url;
}
