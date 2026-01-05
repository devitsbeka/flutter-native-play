import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations, LANGUAGES, DEFAULT_LANGUAGE, getLanguage, getRegionForLanguage, type KaTranslations } from '@/locales';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'app-language';

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

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Track user ID for profile sync (use Supabase directly to avoid circular deps)
  const [userId, setUserId] = useState<string | null>(null);
  
  // Initialize from localStorage or default
  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  });

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Compute region based on language
  const region = useMemo(() => getRegionForLanguage(language), [language]);
  
  // Current language metadata
  const currentLanguage = useMemo(() => getLanguage(language), [language]);

  // Get translations for current language (fallback to Georgian)
  const currentTranslations = useMemo(() => {
    return translations[language] || translations[DEFAULT_LANGUAGE];
  }, [language]);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    // Try current language first
    let value = getNestedValue(currentTranslations, key);
    
    // Fallback to Georgian if not found
    if (!value && language !== DEFAULT_LANGUAGE) {
      value = getNestedValue(translations[DEFAULT_LANGUAGE], key);
    }
    
    // Return key if nothing found
    if (!value) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    // Replace params like {name} with actual values
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{${paramKey}}`;
      });
    }
    
    return value;
  }, [currentTranslations, language]);

  // Set language and sync to profile
  const setLanguage = useCallback(async (lang: string) => {
    // Validate language exists
    if (!LANGUAGES.find(l => l.code === lang)) {
      console.warn(`Invalid language code: ${lang}`);
      return;
    }
    
    // Update state
    setLanguageState(lang);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, lang);
    
    // Sync to profile if logged in
    if (userId) {
      const newRegion = getRegionForLanguage(lang);
      try {
        await supabase
          .from('profiles')
          .update({ 
            preferred_language: lang,
            region: newRegion 
          })
          .eq('user_id', userId);
      } catch (error) {
        console.error('Failed to sync language to profile:', error);
      }
    }
  }, [userId]);

  // On mount, sync from profile if logged in
  useEffect(() => {
    if (!userId) return;

    const syncFromProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('user_id', userId)
          .single();
        
        if (data?.preferred_language && data.preferred_language !== language) {
          // Profile has a different language, use it
          setLanguageState(data.preferred_language);
          localStorage.setItem(STORAGE_KEY, data.preferred_language);
        }
      } catch (error) {
        // Ignore - profile might not exist yet
      }
    };

    syncFromProfile();
  }, [userId]);

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
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

// Standalone t function for use outside React components
// This reads from localStorage directly
export function t(key: string, params?: Record<string, string | number>): string {
  const lang = typeof window !== 'undefined' 
    ? localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE 
    : DEFAULT_LANGUAGE;
  
  const trans = translations[lang] || translations[DEFAULT_LANGUAGE];
  let value = getNestedValue(trans, key);
  
  if (!value && lang !== DEFAULT_LANGUAGE) {
    value = getNestedValue(translations[DEFAULT_LANGUAGE], key);
  }
  
  if (!value) return key;
  
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() ?? `{${paramKey}}`;
    });
  }
  
  return value;
}
