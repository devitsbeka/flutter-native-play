import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { translations, LANGUAGES, DEFAULT_LANGUAGE, getLanguage, getRegionForLanguage } from '@/locales';
import { languageOverride } from '@/utils/languageOverride';
import { stripEmojisExceptFlags } from '@/utils/stripEmojisExceptFlags';
import { supabase } from '@/integrations/supabase/client';


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

// Best-effort write of the player's language to their profile. Quiet on
// every failure — language switching must never depend on the network.
async function syncPreferredLanguage(lang: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ preferred_language: lang })
      .eq('user_id', userId)
      .neq('preferred_language', lang);
  } catch {
    /* offline or signed out — the next change or sign-in tries again */
  }
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
  
  // Fallback to English if key not found
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
    void syncPreferredLanguage(lang);
  }, []);

  // The server has to know the choice too: push notifications are composed
  // server-side in the RECIPIENT's language, read from
  // profiles.preferred_language — a column that localStorage alone never
  // reached, so every push went out in the column's default regardless of
  // what the player picked. Synced on every change and once per sign-in
  // (covers choosing a language while logged out, and accounts created
  // before this sync existed).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Deferred: Supabase runs this callback synchronously inside its
        // auth lock, and issuing requests from there can deadlock.
        setTimeout(() => void syncPreferredLanguage(getStoredLanguage()), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
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
    const currentLang = getLanguage(lang);

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
