import { translations } from "@/locales";

/**
 * `?lang=` on the address this tab was opened with.
 *
 * It is how the other translations get looked at without changing an
 * account's country, so it outranks the country for as long as the tab
 * lives. Kept in sessionStorage so it survives reloads and in-tab
 * navigation — and ONLY sessionStorage: it used to be persisted into the
 * shared `preferredLanguage` localStorage key on every read, which made an
 * open `?lang=ka` tab rewrite the device language nonstop while another
 * tab's country sync wrote it back. The two tabs fired storage events at
 * each other and every open page flickered Georgian/English until one of
 * them closed. A tab-scoped override must never leak into device state.
 */
const SESSION_KEY = "langOverride";

const LANG_OVERRIDE: string | null = (() => {
  try {
    const langParam = new URLSearchParams(window.location.search).get("lang");
    if (langParam && translations[langParam]) {
      sessionStorage.setItem(SESSION_KEY, langParam);
      return langParam;
    }
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored && translations[stored] ? stored : null;
  } catch {
    return null;
  }
})();

export function languageOverride(): string | null {
  return LANG_OVERRIDE;
}
