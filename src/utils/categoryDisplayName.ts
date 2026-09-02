import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readAppLanguage } from "@/utils/appLanguage";

/**
 * Translate a stored category name into the viewer's language.
 *
 * Rooms, invitations and queue items denormalize `category_name` at creation
 * time — in whatever language the creator's picker was showing. Every other
 * participant then reads that literal string: a room made from a Georgian
 * client shows "რელიგია და მითოლოგია" to a French player. The rows carry no
 * category id, so the only handle the display sites have is the name itself.
 *
 * This maps a name in ANY of the app's languages back to its category and
 * out to the viewer's language, using `categories` (Georgian base names)
 * plus the whole `category_translations` table — 45 categories × a handful
 * of languages, fetched once per tab per language. A name that isn't a
 * library category (custom trivia titles, "Random") passes through as-is.
 */

type NameMap = Map<string, string>;
/** Both lookups off the same two queries: name → viewer-language name, and name → icon slug. */
interface CategoryMaps {
  names: NameMap;
  icons: Map<string, string>;
}

let cached: { lang: string; map: CategoryMaps } | null = null;
let inflight: { lang: string; promise: Promise<CategoryMaps> } | null = null;

async function buildMap(lang: string): Promise<CategoryMaps> {
  const [catsRes, transRes] = await Promise.all([
    supabase.from("categories").select("id, name, icon_slug"),
    supabase.from("category_translations").select("category_id, language, name"),
  ]);
  const cats = catsRes.data ?? [];
  const trans = transRes.data ?? [];

  // The name each category should display as for this viewer.
  const target = new Map<string, string>();
  for (const c of cats) target.set(c.id, c.name); // Georgian base
  if (lang !== "ka") {
    for (const t of trans) {
      if (t.language === lang) target.set(t.category_id, t.name);
    }
  }

  // Any known name, in any language → the viewer-language name, and → the
  // category's icon. Rooms denormalize the NAME of their first round and
  // nothing else, so the icon has to be found the same way the translation
  // is: from whatever language the host stored it in.
  const map: NameMap = new Map();
  const icons = new Map<string, string>();
  const iconOf = new Map<string, string>();
  for (const c of cats) if (c.icon_slug) iconOf.set(c.id, c.icon_slug);
  for (const c of cats) {
    const out = target.get(c.id);
    if (out) map.set(c.name, out);
    const icon = iconOf.get(c.id);
    if (icon) icons.set(c.name, icon);
  }
  for (const t of trans) {
    const out = target.get(t.category_id);
    if (out) map.set(t.name, out);
    const icon = iconOf.get(t.category_id);
    if (icon) icons.set(t.name, icon);
  }
  return { names: map, icons };
}

function loadMap(lang: string): Promise<CategoryMaps> {
  if (cached && cached.lang === lang) return Promise.resolve(cached.map);
  if (inflight && inflight.lang === lang) return inflight.promise;
  const promise = buildMap(lang)
    .then((map) => {
      cached = { lang, map };
      return map;
    })
    .catch(() => ({ names: new Map<string, string>(), icons: new Map<string, string>() }));
  inflight = { lang, promise };
  return promise;
}

/**
 * Returns a resolver: `(storedName) => the category's icon slug`, or
 * undefined for a name that is not a library category (or before the map
 * loads). The Public tab's cards use it: the listing carries the first
 * round's icon only when it came from the queue, and a room whose own
 * category IS the first round has a name and no icon.
 */
export function useCategoryIconByName(): (
  stored: string | null | undefined,
) => string | undefined {
  const lang = readAppLanguage();
  const [maps, setMaps] = useState<CategoryMaps | null>(
    cached && cached.lang === lang ? cached.map : null,
  );

  useEffect(() => {
    let cancelled = false;
    void loadMap(lang).then((m) => {
      if (!cancelled) setMaps(m);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return useCallback(
    (stored: string | null | undefined) => {
      if (!stored) return undefined;
      return maps?.icons.get(stored);
    },
    [maps],
  );
}

/**
 * Returns a resolver: `(storedName) => name in the viewer's language`.
 * Falls back to the stored name until the map loads or when the name is not
 * a library category.
 */
export function useLocalizedCategoryName(): (
  stored: string | null | undefined,
) => string | undefined {
  const lang = readAppLanguage();
  const [map, setMap] = useState<NameMap | null>(
    cached && cached.lang === lang ? cached.map.names : null,
  );

  useEffect(() => {
    let cancelled = false;
    void loadMap(lang).then((m) => {
      if (!cancelled) setMap(m.names);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return useCallback(
    (stored: string | null | undefined) => {
      if (!stored) return undefined;
      return map?.get(stored) ?? stored;
    },
    [map],
  );
}
