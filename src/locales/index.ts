// Locales index - exports all translations and utilities

import { ka, type KaTranslations } from './ka';
import { en } from './en';
import { ru } from './ru';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { it } from './it';
import { pt } from './pt';
import { tr } from './tr';
import { pl } from './pl';
import { nl } from './nl';
import { uk } from './uk';
import { ja } from './ja';
import { ko } from './ko';
import { zh } from './zh';
import { ar } from './ar';
import { hi } from './hi';
import { he } from './he';
import { sv } from './sv';
import { az } from './az';

// All available translations
export const translations: Record<string, KaTranslations> = {
  ka,
  en,
  ru,
  es,
  fr,
  de,
  it,
  pt,
  tr,
  pl,
  nl,
  uk,
  ja,
  ko,
  zh,
  ar,
  hi,
  he,
  sv,
  az,
};

// Supported languages with metadata (20 languages)
export const LANGUAGES = [
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', region: 'ge' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'global' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'ru' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'es' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'fr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'de' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'it' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'pt' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'tr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'pl' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'nl' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', region: 'ua' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'jp' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'kr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'cn' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'sa' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'in' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', region: 'il' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'se' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿', region: 'az' },
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
export { ka, en, ru, es, fr, de, it, pt, tr, pl, nl, uk, ja, ko, zh, ar, hi, he, sv, az };
