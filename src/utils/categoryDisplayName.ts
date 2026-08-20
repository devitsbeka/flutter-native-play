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

let cached: { lang: string; map: NameMap } | null = null;
let inflight: { lang: string; promise: Promise<NameMap> } | null = null;

async function buildMap(lang: string): Promise<NameMap> {
  const [catsRes, transRes] = await Promise.all([
    supabase.from("categories").select("id, name"),
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

  // Any known name, in any language → the viewer-language name.
  const map: NameMap = new Map();
  for (const c of cats) {
    const out = target.get(c.id);
    if (out) map.set(c.name, out);
  }
  for (const t of trans) {
    const out = target.get(t.category_id);
    if (out) map.set(t.name, out);
  }
  return map;
}

function loadMap(lang: string): Promise<NameMap> {
  if (cached && cached.lang === lang) return Promise.resolve(cached.map);
  if (inflight && inflight.lang === lang) return inflight.promise;
  const promise = buildMap(lang)
    .then((map) => {
      cached = { lang, map };
      return map;
    })
    .catch(() => new Map<string, string>());
  inflight = { lang, promise };
  return promise;
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
    cached && cached.lang === lang ? cached.map : null,
  );

  useEffect(() => {
    let cancelled = false;
    void loadMap(lang).then((m) => {
      if (!cancelled) setMap(m);
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
