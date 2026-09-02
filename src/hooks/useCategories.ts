import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/data/categories';
import { readAppLanguage } from '@/utils/appLanguage';
import { filterCategoriesForLanguage } from '@/utils/languageCategoryFilter';
import { categoryTier, type CategoryTier } from '@/utils/categoryAccess';

const DEFAULT_LANGUAGE = 'en';

// Read the tab's language directly. Used as the state INITIALIZER — the
// state used to start at DEFAULT_LANGUAGE and get corrected by an effect one
// render later, which fired a wrong-language fetch on every mount and set up
// the stale-response race below.
function readStoredLanguage(): string {
  if (typeof window !== 'undefined') {
    return readAppLanguage(DEFAULT_LANGUAGE);
  }
  return DEFAULT_LANGUAGE;
}

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
  // Optional because the column arrives with the free/premium migration and
  // the client ships ahead of it: until that runs, `select('*')` simply does
  // not return it. `categoryTier` falls back to its own list in that case,
  // so the nine premium categories are locked either way.
  is_premium?: boolean | null;
}

export interface TransformedCategory extends Category {
  uuid: string; // The actual UUID from database
  category_id: string; // String slug like "movies"  
  icon_slug?: string | null;
  image_url?: string | null;
  /** What Explore's უფასო / პრემიუმ filters split on, and what the lock on
   *  a card is drawn from. See `categoryTier` for how the two combine. */
  isPremium: boolean;
  /** free / standard / premium — the whole of what a category costs. */
  tier: CategoryTier;
}

// Transform database category to app Category format
const transformCategory = (dbCat: DatabaseCategory): TransformedCategory => {
  // The tier is worked out ONCE, here, from the row as it actually arrived —
  // column present or not. Every consumer takes `tier` rather than
  // re-deriving it, so a card and the level grid behind it cannot disagree
  // about whether a category is locked.
  const tier = categoryTier({
    category_id: dbCat.category_id,
    isPremium: dbCat.is_premium,
  });
  return {
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
    isPremium: tier === 'premium',
    tier,
  };
};

// Minimum time between category refetches (60 seconds)
const CATEGORIES_STALE_TIME = 60 * 1000;

export const useCategories = () => {
  const [categories, setCategories] = useState<TransformedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [translations, setTranslations] = useState<Record<string, { name: string; description?: string }>>({});
  const [currentLanguage, setCurrentLanguage] = useState<string>(readStoredLanguage);
  // Whether the translation overlay for the current language has settled.
  // Until it has, the hook returns no categories at all: consumers that
  // snapshot the first non-empty list (the VS screen's slot-machine pool)
  // otherwise freeze the raw Georgian names before the overlay arrives and
  // show them under a French/German/... UI for the rest of the match.
  const [translationsReady, setTranslationsReady] = useState(() => readStoredLanguage() === 'ka');
  const lastFetchRef = useRef(0);
  // The language of the most recent fetch. An async response that comes back
  // for any other language is stale and must be dropped: switching en → ka
  // clears the translation overlay synchronously, and without this guard the
  // still-in-flight English fetch resolved afterwards and wrote the English
  // names back — Georgian UI, English category cards, until a refetch.
  const activeLangRef = useRef(currentLanguage);

  // Get current language from localStorage
  const getCurrentLanguage = useCallback(() => readStoredLanguage(), []);

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
    activeLangRef.current = lang;
    if (lang === 'ka') {
      // Georgian is what categories.name holds; no overlay needed
      setTranslations({});
      setTranslationsReady(true);
      return;
    }

    setTranslationsReady(false);
    try {
      const { data, error } = await supabase
        .from('category_translations')
        .select('category_id, name, description')
        .eq('language', lang);

      if (error) throw error;
      if (activeLangRef.current !== lang) return; // stale response — see ref

      const transMap: Record<string, { name: string; description?: string }> = {};
      (data || []).forEach(t => {
        // category_id in translations references categories.id (UUID)
        transMap[t.category_id] = { name: t.name, description: t.description || undefined };
      });
      setTranslations(transMap);
    } catch (err) {
      // A failed lookup falls through to the raw names below — worse than
      // translated, better than an empty screen.
      console.error('Error fetching category translations:', err);
    } finally {
      if (activeLangRef.current === lang) setTranslationsReady(true);
    }
  }, []);

  const fetchCategories = useCallback(async (lang: string) => {
    activeLangRef.current = lang;
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
      if (activeLangRef.current !== lang) return; // stale response — see ref

      // Filter categories based on language rules. Party categories (the
      // multiplayer-only vote ones, e.g. "Most Likely To") stay IN this list —
      // a private room's picker shows them — but every public surface
      // (Discover, quick play, VS-bot pools, leaderboard play, friend
      // challenges) applies excludePartyCategories itself, and CategoryPage
      // routes a party category to the multiplayer flow instead of a grid.
      const filtered = filterCategoriesForLanguage(data || [], lang);

      const transformed = filtered.map(transformCategory);
      setCategories(transformed);
      lastFetchRef.current = Date.now();

      // No blanket icon preload here.
      //
      // This used to fire `new Image()` for every category that has an
      // icon_slug — 51 of the 71 live rows — the moment the list arrived.
      // It was meant to make icons appear sooner and did the opposite on
      // Discover: the icon library is served from the same origin as the
      // REST API, so those requests queue against the very queries the page
      // is still waiting on (progress, favourites, ranks, new-category
      // flags), and 51 of them land before a single card is on screen.
      //
      // Every card already requests its own icon when it renders, so this
      // bought nothing that the render did not do anyway — it just moved the
      // whole library to the front of the queue, including the categories
      // sitting off the end of a carousel the player may never scroll.
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
    categories: translationsReady ? translatedCategories : [],
    loading: loading || !translationsReady,
    error,
    refetch,
    language: currentLanguage,
  };
};
