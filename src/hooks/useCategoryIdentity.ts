import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveCategoryIdentity,
  type CategoryIdentity,
  type CategoryRowIdentity,
} from "@/utils/categoryIdentity";

/**
 * The slug and icon slug for whatever a room recorded as its category.
 *
 * Three columns for every category, fetched once per session and held in a
 * module-level promise — every caller after the first resolves synchronously.
 * That matters here: the one screen that needs this is on for three seconds,
 * so an icon that arrives late arrives after the thing it was drawn for.
 * Calling this from the room page keeps the list warm while players sit in the
 * lobby, well before a round starts.
 */

let cache: CategoryRowIdentity[] | null = null;
let inFlight: Promise<CategoryRowIdentity[]> | null = null;

export function loadCategoryIdentities(): Promise<CategoryRowIdentity[]> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  // Promise.resolve, because a PostgrestBuilder is a PromiseLike: it has
  // `then` and no `catch` or `finally`, so it does not satisfy Promise and
  // cannot be handed back as one.
  inFlight = Promise.resolve(
    supabase.from("categories").select("id, category_id, icon_slug"),
  )
    .then(({ data, error }) => {
      inFlight = null;
      if (error) {
        console.warn("[categoryIdentity] load failed", error);
        // Not cached: a failure here should be retried by the next caller
        // rather than pinned as "this app has no categories".
        return [];
      }
      cache = (data as CategoryRowIdentity[] | null) ?? [];
      return cache;
    });

  return inFlight;
}

export function useCategoryIdentity(raw: string | null | undefined): CategoryIdentity {
  const [rows, setRows] = useState<CategoryRowIdentity[] | null>(cache);

  useEffect(() => {
    if (rows) return;
    let alive = true;
    void loadCategoryIdentities().then((loaded) => {
      if (alive) setRows(loaded);
    });
    return () => {
      alive = false;
    };
  }, [rows]);

  return resolveCategoryIdentity(raw, rows);
}
