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
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
}

// Get region for a language
export function getRegionForLanguage(langCode: string): string {
  const lang = LANGUAGES.find(l => l.code === langCode);
  return lang?.region || 'global';
}

// Default language
export const DEFAULT_LANGUAGE = 'ka';

// Re-export types
export type { KaTranslations };
export { ka, en, es, fr, de, it, pt };
