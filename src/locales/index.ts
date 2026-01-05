// Locales index - exports all translations and utilities

import { ka, type KaTranslations } from './ka';
import { en } from './en';

// All available translations
export const translations: Record<string, KaTranslations> = {
  ka,
  en,
};

// Supported languages with metadata
export const LANGUAGES = [
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', region: 'ge' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'global' },
  // Future languages:
  // { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'ru' },
  // { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'es' },
  // { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'fr' },
  // { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'de' },
  // { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'tr' },
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
export { ka, en };
