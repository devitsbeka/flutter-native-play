import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { translations, LANGUAGES, DEFAULT_LANGUAGE, getLanguage, getRegionForLanguage } from '@/locales';


interface LanguageContextType {
  language: string;
  region: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: typeof LANGUAGES;
  currentLanguage: typeof LANGUAGES[number];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper to get nested value from object using dot notation
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let value = obj;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  
  return typeof value === 'string' ? value : undefined;
}

// Remove emojis from user-facing translation strings.
// Exception: keep country-flag emojis (regional indicator symbols).
function stripEmojisExceptFlags(input: string): string {
  if (!input) return input;

  return Array.from(input)
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      const isRegionalIndicator = cp >= 0x1f1e6 && cp <= 0x1f1ff;
      if (isRegionalIndicator) return true;

      // Unicode property escape (supported in modern browsers)
      const isEmoji = /\p{Extended_Pictographic}/u.test(ch);
      return !isEmoji;
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Georgian is the only supported language — no selection, no sync
  const language = DEFAULT_LANGUAGE;

  // Compute region based on language
  const region = useMemo(() => getRegionForLanguage(language), [language]);

  // Current language metadata
  const currentLanguage = useMemo(() => getLanguage(language), [language]);

  // Get translations for current language
  const currentTranslations = useMemo(() => {
    return translations[DEFAULT_LANGUAGE];
  }, []);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(currentTranslations, key);

    // Return key if nothing found
    if (!value) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    // Replace params like {name} with actual values
    const withParams = params
      ? value.replace(/\{(\w+)\}/g, (_, paramKey) => {
          return params[paramKey]?.toString() ?? `{${paramKey}}`;
        })
      : value;

    return stripEmojisExceptFlags(withParams);
  }, [currentTranslations]);

  // No-op — language is fixed to Georgian
  const setLanguage = useCallback((_lang: string) => {}, []);

  const value = useMemo(() => ({
    language,
    region,
    setLanguage,
    t,
    languages: LANGUAGES,
    currentLanguage,
  }), [language, region, setLanguage, t, currentLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  // During HMR or before provider mounts, return a fallback
  if (!context) {
    const currentLang = LANGUAGES.find(l => l.code === DEFAULT_LANGUAGE) || LANGUAGES[0];

    return {
      language: DEFAULT_LANGUAGE,
      region: getRegionForLanguage(DEFAULT_LANGUAGE),
      setLanguage: () => {},
      t,
      languages: LANGUAGES,
      currentLanguage: currentLang,
    };
  }

  return context;
}

// Standalone t function for use outside React components
export function t(key: string, params?: Record<string, string | number>): string {
  const trans = translations[DEFAULT_LANGUAGE];
  const value = getNestedValue(trans, key);

  if (!value) return key;

  const withParams = params
    ? value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{${paramKey}}`;
      })
    : value;

  return stripEmojisExceptFlags(withParams);
}
