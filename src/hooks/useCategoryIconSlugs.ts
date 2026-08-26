import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_ID_TO_ICON } from "@/data/categoryIconMap";

/**
 * The icon slug for a category, from the table Discover reads.
 *
 * There were two answers to "which icon is this category" and they had drifted
 * badly apart: `categories.icon_slug` in the database, which Discover draws
 * from, and CATEGORY_ID_TO_ICON hardcoded in the client, which every TV
 * surface drew from. Measured against the live catalogue, 39 of 70 categories
 * disagreed and 25 more were not in the hardcoded map at all — only 6 matched.
 * Celebrities was `pop-star` in the database and `star` in the map, which is
 * why the same category wore a singer on Discover and a gold star in the TV
 * round queue.
 *
 * That is not a typo to patch; it is what a second source of truth does. A
 * migration curated the column, nobody thought to edit a TypeScript file, and
 * nothing could have told them. So the database wins here, and the hardcoded
 * map is demoted to what it can honestly be: something to draw before the
 * fetch lands, and a net for a category the query did not return.
 *
 * One query for the whole app. The result is cached at module scope and
 * shared, so a screen with a queue, a picker and a header pays for it once.
 */
type SlugMap = Map<string, string>;

let cached: SlugMap | null = null;
let inflight: Promise<SlugMap> | null = null;

async function loadSlugs(): Promise<SlugMap> {
  const { data, error } = await supabase
    .from("categories")
    .select("category_id, icon_slug")
    .eq("is_active", true);

  if (error || !data) {
    // Leave the cache empty rather than poisoning it with a failure: the next
    // caller retries, and until then everything falls back to the map.
    inflight = null;
    return new Map();
  }

  const map: SlugMap = new Map();
  for (const row of data as { category_id: string | null; icon_slug: string | null }[]) {
    if (row.category_id && row.icon_slug) map.set(row.category_id, row.icon_slug);
  }
  cached = map;
  return map;
}

export function primeCategoryIconSlugs(): Promise<SlugMap> {
  if (cached) return Promise.resolve(cached);
  inflight = inflight ?? loadSlugs();
  return inflight;
}

/**
 * The single best slug for a category — what to WRITE somewhere.
 *
 * The column first, then whatever the caller already had, then the map.
 */
export function categoryIconSlugSync(
  categoryId: string | null | undefined,
  fallback?: string | null,
): string | null {
  if (!categoryId) return fallback ?? null;
  return cached?.get(categoryId) ?? fallback ?? CATEGORY_ID_TO_ICON[categoryId] ?? null;
}

/**
 * Every slug worth trying, best first, comma-joined — what to RENDER with.
 *
 * DynamicIcon splits a comma-separated slug and tries each in turn, and that
 * is load-bearing rather than decorative: a handful of categories name an
 * icon the shipped index does not carry (`archaeology` is `archeo`,
 * `economics` is `economics-icon`). Given only those, DynamicIcon finds
 * nothing in the index and falls back to an icon picked by hashing the id —
 * stable, subject-unrelated, and not obviously wrong, which is how "Guess the
 * city" once ended up illustrated with a banana.
 *
 * CATEGORY_ID_TO_ICON is what covers those, and the twenty national
 * categories that carry no icon_slug at all. It is a complement to the
 * column, not a duplicate of it — which is why this returns both rather than
 * picking one. RoundCountdown has always done exactly this; the TV screens
 * were the ones reading the map INSTEAD of the column, and that is the bug.
 */
export function categoryIconCandidates(
  categoryId: string | null | undefined,
  fallback?: string | null,
): string | null {
  const seen: string[] = [];
  const add = (s: string | null | undefined) => {
    if (s && !seen.includes(s)) seen.push(s);
  };
  if (categoryId) add(cached?.get(categoryId));
  add(fallback);
  if (categoryId) add(CATEGORY_ID_TO_ICON[categoryId]);
  return seen.length ? seen.join(",") : null;
}

export function useCategoryIconSlugs() {
  const [ready, setReady] = useState(() => cached !== null);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    void primeCategoryIconSlugs().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * `fallback` is whatever the caller already had — typically a slug
   * snapshotted into a queue row when the round was added. The live column
   * still wins over it: a snapshot taken months ago is exactly how a queue
   * ends up showing an icon the category no longer uses.
   */
  const iconSlugFor = useCallback(
    (categoryId: string | null | undefined, fallback?: string | null) =>
      categoryIconCandidates(categoryId, fallback),
    // `ready` is the dependency on purpose: the map arrives by side effect,
    // so this has to change identity when it lands or memoised rows below
    // keep drawing the fallback for ever.
    [ready], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { iconSlugFor, ready };
}
