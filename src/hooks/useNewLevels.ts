import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface CategoryLastSeen {
  category_id: string;
  last_seen_total_levels: number;
}

export function useNewLevels() {
  const { user } = useAuth();
  const [newLevelCategories, setNewLevelCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const checkNewLevels = useCallback(async () => {
    if (!user) {
      setNewLevelCategories(new Set());
      return;
    }

    setLoading(true);
    try {
      // Get user's last seen levels for each category
      const { data: lastSeenData, error: lastSeenError } = await supabase
        .from('user_category_last_seen')
        .select('category_id, last_seen_total_levels')
        .eq('user_id', user.id);

      if (lastSeenError) throw lastSeenError;

      // Get current category total levels
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, total_levels')
        .eq('is_active', true);

      if (categoriesError) throw categoriesError;

      // Create a map of last seen levels
      const lastSeenMap = new Map<string, number>();
      (lastSeenData || []).forEach((item: CategoryLastSeen) => {
        lastSeenMap.set(item.category_id, item.last_seen_total_levels);
      });

      // Find categories with new levels
      const newCategories = new Set<string>();
      (categories || []).forEach((cat) => {
        const lastSeen = lastSeenMap.get(cat.id);
        // Only mark as new if user has played it before AND there are new levels
        if (lastSeen !== undefined && cat.total_levels > lastSeen) {
          newCategories.add(cat.id);
        }
      });

      setNewLevelCategories(newCategories);
    } catch (error) {
      console.error('Error checking for new levels:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkNewLevels();
  }, [checkNewLevels]);

  const hasNewLevels = useCallback((categoryId: string) => {
    return newLevelCategories.has(categoryId);
  }, [newLevelCategories]);

  const clearNewLevelBadge = useCallback(async (categoryId: string, currentTotalLevels: number) => {
    if (!user) return;

    try {
      await supabase
        .from('user_category_last_seen')
        .upsert({
          user_id: user.id,
          category_id: categoryId,
          last_seen_total_levels: currentTotalLevels,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,category_id' });

      // Remove from local state
      setNewLevelCategories(prev => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    } catch (error) {
      console.error('Error clearing new level badge:', error);
    }
  }, [user]);

  return { hasNewLevels, newLevelCategories, loading, clearNewLevelBadge, refetch: checkNewLevels };
}
