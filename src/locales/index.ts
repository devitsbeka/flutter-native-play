// Locales index - exports all translations and utilities

import { ka, type KaTranslations } from './ka';
import { en } from './en';

import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { it } from './it';
import { pt } from './pt';

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
