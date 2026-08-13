/**
 * A country's name in the language the player is reading.
 *
 * The app's own country table (`countryCoordinates`) names every country in
 * Georgian, because that is the language it was written in. Reading a name
 * straight out of it is how an English session ended up with a country list
 * that said "საქართველო", "აშშ", "გერმანია" — English chrome around Georgian
 * content, which is the thing this is meant to stop.
 *
 * `Intl.DisplayNames` knows all of them in every language the app ships, so
 * it answers wherever it can. Georgian is the exception and reads from the
 * table: browsers frequently ship no `ka` region data and silently hand back
 * the English name instead, which would be the same bug pointing the other
 * way.
 */

import { countryCoordinates } from "@/lib/countryCoordinates";

/** Codes the app uses that are not the ISO 3166-1 alpha-2 Intl expects. */
const ISO_ALIASES: Record<string, string> = { uk: "GB" };

export function countryName(
  code: string | null | undefined,
  language: string,
  fallback = "",
): string {
  if (!code) return fallback;
  const lower = code.toLowerCase();

  if (language === "ka") {
    const own = countryCoordinates[lower]?.name;
    if (own) return own;
  }

  const iso = ISO_ALIASES[lower] ?? code.toUpperCase();
  try {
    const named = new Intl.DisplayNames([language], { type: "region" }).of(iso);
    // Given an unknown region, DisplayNames hands the code straight back.
    if (named && named !== iso) return named;
  } catch {
    // No Intl data for this language — fall through.
  }

  return countryCoordinates[lower]?.name || fallback || code.toUpperCase();
}

/** The flag emoji for a country code. `uk` is not a flag; `gb` is. */
export function countryFlag(code: string): string {
  const iso = ISO_ALIASES[code.toLowerCase()] ?? code.toUpperCase();
  return iso
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}
