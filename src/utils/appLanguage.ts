import { languageOverride } from "./languageOverride";

export const LANGUAGE_STORAGE_KEY = "preferredLanguage";

/**
 * The language this tab should use, for code that reads it outside React.
 *
 * One rule, applied everywhere: the tab's `?lang=` override first (it is
 * tab-scoped and deliberately never written to localStorage — see
 * languageOverride.ts), then the device's stored choice, then the fallback.
 * Before this helper, a dozen call sites read localStorage directly and an
 * override tab drifted out of sync with its own UI.
 */
export function readAppLanguage(fallback = "en"): string {
  const override = languageOverride();
  if (override) return override;
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || fallback;
  } catch {
    return fallback;
  }
}
