import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/data/categories';
import { preloadIcons } from '@/hooks/useIconLibrary';

const STORAGE_KEY = 'preferredLanguage';
const DEFAULT_LANGUAGE = 'en';

export interface DatabaseCategory {
  id: string; // UUID
  category_id: string; // String slug like "movies"
  name: string;
  icon: string;
  icon_slug?: string | null;
  color: string;
  description: string | null;
  total_levels: number;
  type: string;
  is_active: boolean | null;
  sort_order: number | null;
  image_url: string | null;
  language?: string | null;
  is_language_specific?: boolean | null;
}

export interface TransformedCategory extends Category {
  uuid: string; // The actual UUID from database
  category_id: string; // String slug like "movies"  
  icon_slug?: string | null;
  image_url?: string | null;
}

// Build icon URL from slug
function getIconUrl(slug: string): string {
  return `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${slug}.png`;
}

// Transform database category to app Category format
const transformCategory = (dbCat: DatabaseCategory): TransformedCategory => ({
  id: dbCat.category_id, // Keep using category_id as id for backwards compatibility
  uuid: dbCat.id, // Add the actual UUID
  category_id: dbCat.category_id,
  name: dbCat.name,
  icon: dbCat.icon,
  icon_slug: dbCat.icon_slug,
  color: dbCat.color,
  description: dbCat.description || '',
  totalLevels: dbCat.total_levels,
  type: dbCat.type as 'classic' | 'fun' | 'educational',
  image_url: dbCat.image_url,
});

// Minimum time between category refetches (60 seconds)
const CATEGORIES_STALE_TIME = 60 * 1000;

export const useCategories = () => {
  const [categories, setCategories] = useState<TransformedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [translations, setTranslations] = useState<Record<string, { name: string; description?: string }>>({});
  const [currentLanguage, setCurrentLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const lastFetchRef = useRef(0);

  // Get current language from localStorage
  const getCurrentLanguage = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  }, []);

  // Update language on mount and when storage changes
  useEffect(() => {
    setCurrentLanguage(getCurrentLanguage());
    
    const handleStorageChange = () => {
      setCurrentLanguage(getCurrentLanguage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [getCurrentLanguage]);

  const fetchTranslations = useCallback(async (lang: string) => {
    if (lang === 'ka') {
      // Georgian is the default, no translations needed
      setTranslations({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('category_translations')
        .select('category_id, name, description')
        .eq('language', lang);

      if (error) throw error;

      const transMap: Record<string, { name: string; description?: string }> = {};
      (data || []).forEach(t => {
        // category_id in translations references categories.id (UUID)
        transMap[t.category_id] = { name: t.name, description: t.description || undefined };
      });
      setTranslations(transMap);
    } catch (err) {
      console.error('Error fetching category translations:', err);
    }
  }, []);

  const fetchCategories = useCallback(async (lang: string) => {
    try {
      // Fetch categories logic:
      // 1. Universal categories (is_language_specific = false) - show for all languages
      // 2. Language-specific categories (is_language_specific = true) - only show if language matches
      
      // For Georgian, show all categories (backward compatible)
      // For other languages, show universal + matching language-specific ones
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Filter categories based on language rules
      const filtered = (data || []).filter(cat => {
        // Universal categories are shown to everyone
        if (!cat.is_language_specific) {
          return true;
        }
        // Language-specific categories only shown if language matches
        return cat.language === lang;
      });

      const transformed = filtered.map(transformCategory);
      setCategories(transformed);
      lastFetchRef.current = Date.now();

      // Preload category icons for faster rendering
      const iconUrls = transformed
        .filter(cat => cat.icon_slug)
        .map(cat => getIconUrl(cat.icon_slug!));
      
      if (iconUrls.length > 0) {
        preloadIcons(iconUrls);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories(currentLanguage);

    // Subscribe to real-time changes
    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        () => {
          // Refetch on any change
          fetchCategories(currentLanguage);
        }
      )
      .subscribe();

    // Refetch when app comes back to foreground (fixes iOS homescreen app issue)
    // Only refetch if data is stale (>60s since last fetch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > CATEGORIES_STALE_TIME) {
        fetchCategories(currentLanguage);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCategories, currentLanguage]);

  // Fetch translations when language changes
  useEffect(() => {
    fetchTranslations(currentLanguage);
  }, [currentLanguage, fetchTranslations]);

  // Apply translations to categories
  const translatedCategories = useMemo(() => {
    if (Object.keys(translations).length === 0) {
      return categories;
    }

    return categories.map(cat => {
      // translations are keyed by category_id (UUID)
      const trans = translations[cat.uuid];
      if (trans) {
        return {
          ...cat,
          name: trans.name,
          description: trans.description || cat.description,
        };
      }
      return cat;
    });
  }, [categories, translations]);

  const refetch = useCallback(() => {
    fetchCategories(currentLanguage);
  }, [fetchCategories, currentLanguage]);

  return { 
    categories: translatedCategories, 
    loading, 
    error, 
    refetch,
    language: currentLanguage,
  };
};
