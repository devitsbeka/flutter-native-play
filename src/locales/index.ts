// Locales index - exports all translations and utilities

import { ka, type KaTranslations } from './ka';
import { en } from './en';

import { es, refreshEnglishFallback as refreshEsEnglish } from './es';
import { fr, refreshEnglishFallback as refreshFrEnglish } from './fr';
import { de, refreshEnglishFallback as refreshDeEnglish } from './de';
import { it, refreshEnglishFallback as refreshItEnglish } from './it';
import { pt, refreshEnglishFallback as refreshPtEnglish } from './pt';

// All available translations
export const translations: Record<string, KaTranslations> = {
  ka,
  en,
  es,
  fr,
  de,
  it,
  pt,
};

// Supported languages (7 languages)
export const LANGUAGES = [
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', region: 'ge' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'global' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'es' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'fr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'de' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'it' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'pt' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];
export type RegionCode = typeof LANGUAGES[number]['region'];

// Get language metadata by code
export function getLanguage(code: string) {
  return (
    LANGUAGES.find(l => l.code === code) ||
    LANGUAGES.find(l => l.code === DEFAULT_LANGUAGE) ||
    LANGUAGES[0]
  );
}

// Get region for a language
export function getRegionForLanguage(langCode: string): string {
  const lang = LANGUAGES.find(l => l.code === langCode);
  return lang?.region || 'global';
}

// The language a user gets before choosing one, and the missing-key
// fallback. English: everyone can at least read it, whereas a Georgian
// fallback is unreadable to anyone outside Georgia. en is type-checked
// against ka, so falling back to it never lands on a missing key.
export const DEFAULT_LANGUAGE = 'en';

// The language the DATABASE content is written in: categories.name,
// notification rows written by migrations, question base text. Not a UI
// default — use it for "does this need a translation lookup" checks only.
export const CONTENT_LANGUAGE = 'ka';

// Re-export types
export type { KaTranslations };
export { ka, en, es, fr, de, it, pt };


// A locale edit updates the existing dictionaries instead of invalidating every
// component that imports the language context. Runtime language state stays put.
const translationUpdateListeners = new Set<() => void>();

export function subscribeTranslationUpdates(listener: () => void): () => void {
  if (!import.meta.hot) return () => {};
  translationUpdateListeners.add(listener);
  return () => { translationUpdateListeners.delete(listener); };
}

if (import.meta.hot) {
  const englishRefreshers = { es: refreshEsEnglish, fr: refreshFrEnglish, de: refreshDeEnglish, it: refreshItEnglish, pt: refreshPtEnglish };

  // Dev-only: the Vite plugin has verified the actual source write and exact dictionary path.
  const dictionaryUpdated = (event: Event) => {
    const detail = (event as CustomEvent<{ exportName?: unknown; hash?: unknown; dictionary?: unknown }>).detail;
    if (!detail || typeof detail.exportName !== 'string' || !Object.prototype.hasOwnProperty.call(translations, detail.exportName) || typeof detail.hash !== 'string' || !/^[a-f0-9]{64}$/.test(detail.hash) || !detail.dictionary || typeof detail.dictionary !== 'object' || Array.isArray(detail.dictionary)) return;
    const replace = (language: string, replacement: KaTranslations) => {
      const current = translations[language] as unknown as Record<string, unknown>;
      for (const key of Object.keys(current)) if (!Object.prototype.hasOwnProperty.call(replacement, key)) delete current[key];
      Object.assign(current, replacement);
    };
    replace(detail.exportName, detail.dictionary as KaTranslations);
    if (detail.exportName === 'en') {
      for (const [language, rebuild] of Object.entries(englishRefreshers)) replace(language, rebuild(translations.en));
    }
    for (const listener of translationUpdateListeners) listener();
  };
  window.addEventListener('spark:dictionary-updated', dictionaryUpdated);
  import.meta.hot.dispose(() => window.removeEventListener('spark:dictionary-updated', dictionaryUpdated));
  import.meta.hot.accept(['./ka', './en', './es', './fr', './de', './it', './pt'], (modules) => {
    const updates: (readonly [string, KaTranslations | undefined])[] = [
      ['ka', modules[0]?.ka], ['en', modules[1]?.en],
      ['es', modules[2]?.es], ['fr', modules[3]?.fr],
      ['de', modules[4]?.de], ['it', modules[5]?.it], ['pt', modules[6]?.pt],
    ];
    if (modules[2]?.refreshEnglishFallback) englishRefreshers.es = modules[2].refreshEnglishFallback;
    if (modules[3]?.refreshEnglishFallback) englishRefreshers.fr = modules[3].refreshEnglishFallback;
    if (modules[4]?.refreshEnglishFallback) englishRefreshers.de = modules[4].refreshEnglishFallback;
    if (modules[5]?.refreshEnglishFallback) englishRefreshers.it = modules[5].refreshEnglishFallback;
    if (modules[6]?.refreshEnglishFallback) englishRefreshers.pt = modules[6].refreshEnglishFallback;
    if (modules[1]?.en) {
      for (const [language, rebuild] of Object.entries(englishRefreshers)) {
        updates.push([language, rebuild(modules[1].en)]);
      }
    }
    let updated = false;
    for (const [language, replacement] of updates) {
      if (!replacement) continue;
      const current = translations[language] as unknown as Record<string, unknown>;
      // Keep root identity shared by translations and the public named exports.
      for (const key of Object.keys(current)) if (!(key in replacement)) delete current[key];
      Object.assign(current, replacement);
      updated = true;
    }
    if (updated) for (const listener of translationUpdateListeners) listener();
  });
}
