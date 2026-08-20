// Standalone translation helper for use outside React components (contexts, callbacks, etc.)
// Reads language preference from localStorage and resolves keys from the locale files.

import { translations, DEFAULT_LANGUAGE } from '@/locales';
import { readAppLanguage } from '@/utils/appLanguage';

function getCurrentLanguage(): string {
  return readAppLanguage(DEFAULT_LANGUAGE);
}

/**
 * Translate a dotted key path (e.g. "extra.roomCreated") using the current language.
 * Falls back to English, then to the key itself.
 */
export function t(key: string): string {
  const lang = getCurrentLanguage();
  const keys = key.split('.');

  // Try current language first
  let result: unknown = translations[lang];
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      result = undefined;
      break;
    }
  }
  if (typeof result === 'string') return result;

  // Fallback to English
  let fallback: unknown = translations['en'];
  for (const k of keys) {
    if (fallback && typeof fallback === 'object' && k in fallback) {
      fallback = (fallback as Record<string, unknown>)[k];
    } else {
      return key; // key not found at all
    }
  }
  return typeof fallback === 'string' ? fallback : key;
}
