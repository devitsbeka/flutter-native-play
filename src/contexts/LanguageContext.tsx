import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { translations, LANGUAGES, DEFAULT_LANGUAGE, getLanguage, getRegionForLanguage } from '@/locales';
import { languageOverride } from '@/utils/languageOverride';
import { stripEmojisExceptFlags } from '@/utils/stripEmojisExceptFlags';


interface LanguageContextType {
  language: string;
  region: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: typeof LANGUAGES;
  currentLanguage: typeof LANGUAGES[number];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'preferredLanguage';

function getStoredLanguage(): string {
  try {
    // ?lang= outranks everything for this tab — see utils/languageOverride.
    const override = languageOverride();
    if (override) {
      localStorage.setItem(STORAGE_KEY, override);
      return override;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) return stored;
  } catch {}
  return DEFAULT_LANGUAGE;
}

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

function translateWithFallback(lang: string, key: string, params?: Record<string, string | number>): string {
  let value = getNestedValue(translations[lang], key);
  
  // Fallback to Georgian if key not found
  if (!value && lang !== DEFAULT_LANGUAGE) {
    value = getNestedValue(translations[DEFAULT_LANGUAGE], key);
  }

  if (!value) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }

  const withParams = params
    ? value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{${paramKey}}`;
      })
    : value;

  return stripEmojisExceptFlags(withParams);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(getStoredLanguage);

  // Compute region based on language
  const region = useMemo(() => getRegionForLanguage(language), [language]);

  // Current language metadata
  const currentLanguage = useMemo(() => getLanguage(language), [language]);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    return translateWithFallback(language, key, params);
  }, [language]);

  // Persist language choice and dispatch storage event for other hooks
  const setLanguage = useCallback((lang: string) => {
    if (!translations[lang]) return;
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      // Dispatch storage event so useCategories and other hooks pick it up
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: lang }));
    } catch {}
  }, []);

  // Listen for external storage changes (e.g. another tab)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && translations[e.newValue]) {
        setLanguageState(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

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
    const lang = getStoredLanguage();
    const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

    return {
      language: lang,
      region: getRegionForLanguage(lang),
      setLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => translateWithFallback(lang, key, params),
      languages: LANGUAGES,
      currentLanguage: currentLang,
    };
  }

  return context;
}

// Standalone t function for use outside React components
export function t(key: string, params?: Record<string, string | number>): string {
  const lang = getStoredLanguage();
  return translateWithFallback(lang, key, params);
}
