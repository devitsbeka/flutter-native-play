import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readAppLanguage } from "@/utils/appLanguage";

const STORAGE_KEY = "preferredLanguage";
// What a user with no stored choice reads in — see locales/index.ts.
const DEFAULT_LANGUAGE = "en";
// What categories.name is written in; no lookup needed when reading in it.
const CONTENT_LANGUAGE = "ka";

/**
 * A category's name in the language the player is actually reading.
 *
 * `categories.name` is Georgian and there is one row per category — the
 * translations live in `category_translations`, keyed by the category's UUID
 * and a language code. Discover gets this right because `useCategories` joins
 * them in; the quiz screen fetched its own single row and rendered the raw
 * Georgian name, so an English game was played under a Georgian heading.
 *
 * This is for a screen that already has its one category and should not pull
 * all forty-five to translate it. Screens that list categories keep using
 * `useCategories`.
 *
 * Georgian needs no lookup: it is what the base row already holds.
 */
export function useCategoryDisplayName(
  categoryUuid: string | null | undefined,
  fallback: string | null | undefined,
): string | undefined {
  const [name, setName] = useState<string | undefined>(fallback ?? undefined);

  // Show the Georgian name immediately and let the translation replace it,
  // rather than leaving the heading empty while one request is in flight.
  useEffect(() => {
    setName(fallback ?? undefined);
  }, [fallback]);

  useEffect(() => {
    if (!categoryUuid) return;

    const lang = readAppLanguage(DEFAULT_LANGUAGE);
    if (lang === CONTENT_LANGUAGE) return;

    let cancelled = false;
    void supabase
      .from("category_translations")
      .select("name")
      .eq("category_id", categoryUuid)
      .eq("language", lang)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.name) setName(data.name);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryUuid]);

  return name;
}
