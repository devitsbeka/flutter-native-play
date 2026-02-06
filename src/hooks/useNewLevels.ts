import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface CategoryLastSeen {
  category_id: string;
  last_seen_total_levels: number;
}

async function fetchNewLevelCategories(userId: string): Promise<Set<string>> {
  const { data: lastSeenData, error: lastSeenError } = await supabase
    .from('user_category_last_seen')
    .select('category_id, last_seen_total_levels')
    .eq('user_id', userId);

  if (lastSeenError) throw lastSeenError;

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, total_levels')
    .eq('is_active', true);

  if (categoriesError) throw categoriesError;

  const lastSeenMap = new Map<string, number>();
  (lastSeenData || []).forEach((item: CategoryLastSeen) => {
    lastSeenMap.set(item.category_id, item.last_seen_total_levels);
  });

  const newCategories = new Set<string>();
  (categories || []).forEach((cat) => {
    const lastSeen = lastSeenMap.get(cat.id);
    if (lastSeen !== undefined && cat.total_levels > lastSeen) {
      newCategories.add(cat.id);
    }
  });

  return newCategories;
}

export function useNewLevels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: newLevelCategories = new Set<string>(), isLoading: loading } = useQuery({
    queryKey: ["new-level-categories", user?.id],
    queryFn: () => fetchNewLevelCategories(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,   // 5 min — new levels are rare
    gcTime: 10 * 60 * 1000,
  });

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

      // Optimistically remove from cache
      queryClient.setQueryData<Set<string>>(
        ["new-level-categories", user.id],
        (prev) => {
          if (!prev) return new Set();
          const next = new Set(prev);
          next.delete(categoryId);
          return next;
        }
      );
    } catch (error) {
      console.error('Error clearing new level badge:', error);
    }
  }, [user, queryClient]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["new-level-categories", user?.id] });
  }, [queryClient, user?.id]);

  return { hasNewLevels, newLevelCategories, loading, clearNewLevelBadge, refetch };
}
