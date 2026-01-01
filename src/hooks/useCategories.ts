import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/data/categories';

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
}

export interface TransformedCategory extends Category {
  uuid: string; // The actual UUID from database
  category_id: string; // String slug like "movies"  
  icon_slug?: string | null;
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
});

export const useCategories = () => {
  const [categories, setCategories] = useState<TransformedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      setCategories((data || []).map(transformCategory));
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();

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
          fetchCategories();
        }
      )
      .subscribe();

    // Refetch when app comes back to foreground (fixes iOS homescreen app issue)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCategories();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refetch on focus (for desktop browsers)
    const handleFocus = () => {
      fetchCategories();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
};
