import { LANGUAGES, DEFAULT_LANGUAGE, translations } from "@/locales";

/**
 * The legal pages, pinned to a language by their URL.
 *
 * App Store Connect takes a **privacy policy URL per App Store localization**,
 * and the page behind each one has to render in that language for anyone who
 * opens it — a reviewer on the German storefront, or a player who has never
 * launched the app. `/privacy-policy` alone cannot do that: it renders in
 * whatever language the visitor's `localStorage` happens to hold, which for a
 * first-time visitor is English regardless of which listing sent them.
 *
 * So `/privacy-policy/de` exists, and it is German for everybody. The path is
 * the whole state — nothing is read from or written to storage, and the
 * visitor's own in-app language preference is left alone.
 */

/** Language codes the legal routes will serve. */
export const LEGAL_LANGUAGES = LANGUAGES.map((l) => l.code) as readonly string[];

export function isLegalLanguage(code: string | undefined): boolean {
  return !!code && LEGAL_LANGUAGES.includes(code);
}

function getNested(source: unknown, path: string): string | undefined {
  let value: unknown = source;
  for (const key of path.split(".")) {
    if (value && typeof value === "object" && key in (value as object)) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * A translator bound to one language, independent of app state.
 *
 * Falls back to English for a key a locale has not translated yet, then to the
 * key itself — the same order `LanguageContext` uses, so a pinned page and the
 * in-app page resolve identically.
 */
export function translatorFor(lang: string) {
  return (key: string): string =>
    getNested(translations[lang], key) ??
    getNested(translations[DEFAULT_LANGUAGE], key) ??
    key;
}
