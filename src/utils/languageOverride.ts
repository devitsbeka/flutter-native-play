import { translations } from "@/locales";

/**
 * `?lang=` on the address this tab was opened with.
 *
 * Read once, at module load, because the param is gone from the URL after the
 * first navigation and the override has to outlive it. It is how the other
 * translations get looked at without changing an account's country, so it
 * outranks the country for as long as the tab lives.
 */
const LANG_OVERRIDE: string | null = (() => {
  try {
    const langParam = new URLSearchParams(window.location.search).get("lang");
    return langParam && translations[langParam] ? langParam : null;
  } catch {
    return null;
  }
})();

export function languageOverride(): string | null {
  return LANG_OVERRIDE;
}
