import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";

const MAX_FREE_LEVELS_PER_CATEGORY = 3;
const MAX_FREE_CATEGORIES = 5;

interface CategoryPlayData {
  /** Map of category_id -> set of completed level numbers */
  categoriesPlayed: Map<string, Set<number>>;
  loading: boolean;
}

export function useCategoryPlayLimit() {
  const { user } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();
  const [data, setData] = useState<CategoryPlayData>({
    categoriesPlayed: new Map(),
    loading: true,
  });

  // Fetch user's level progress from DB
  useEffect(() => {
    if (!user) {
      setData({ categoriesPlayed: new Map(), loading: false });
      return;
    }

    const fetchProgress = async () => {
      const { data: progressRows, error } = await supabase
        .from("user_level_progress")
        .select("category_id, level_number")
        .eq("user_id", user.id);

      if (error) {
        console.error("[useCategoryPlayLimit] Failed to fetch progress:", error);
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      const map = new Map<string, Set<number>>();
      for (const row of progressRows || []) {
        if (!map.has(row.category_id)) {
          map.set(row.category_id, new Set());
        }
        map.get(row.category_id)!.add(row.level_number);
      }

      setData({ categoriesPlayed: map, loading: false });
    };

    fetchProgress();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("category-play-limit")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_level_progress",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const totalCategoriesUsed = data.categoriesPlayed.size;

  const getLevelsPlayedInCategory = useCallback(
    (categoryId: string): number => {
      return data.categoriesPlayed.get(categoryId)?.size ?? 0;
    },
    [data.categoriesPlayed]
  );

  const isCategoryAlreadyStarted = useCallback(
    (categoryId: string): boolean => {
      return data.categoriesPlayed.has(categoryId);
    },
    [data.categoriesPlayed]
  );

  /**
   * Check if user can play a specific level in a category.
   * PRO users always can. Non-PRO: max 3 levels per category, max 5 categories.
   */
  const canPlayLevel = useCallback(
    (categoryId: string, levelNumber?: number): boolean => {
      if (isVip) return true;
      if (!user) return true; // Guests handled separately by auth gates

      const levelsPlayed = getLevelsPlayedInCategory(categoryId);
      const alreadyStarted = isCategoryAlreadyStarted(categoryId);

      // If specific level requested, check if already completed (always allow replay)
      if (levelNumber !== undefined) {
        const completedLevels = data.categoriesPlayed.get(categoryId);
        if (completedLevels?.has(levelNumber)) return true;
      }

      // Check level limit within category
      if (levelsPlayed >= MAX_FREE_LEVELS_PER_CATEGORY) return false;

      // Check category limit (allow if already started this category)
      if (!alreadyStarted && totalCategoriesUsed >= MAX_FREE_CATEGORIES) return false;

      return true;
    },
    [isVip, user, getLevelsPlayedInCategory, isCategoryAlreadyStarted, totalCategoriesUsed, data.categoriesPlayed]
  );

  /**
   * Check if the entire category is blocked (new category + 5 cats used)
   */
  const isCategoryBlocked = useCallback(
    (categoryId: string): boolean => {
      if (isVip) return false;
      if (!user) return false;
      return !isCategoryAlreadyStarted(categoryId) && totalCategoriesUsed >= MAX_FREE_CATEGORIES;
    },
    [isVip, user, isCategoryAlreadyStarted, totalCategoriesUsed]
  );

  return {
    canPlayLevel,
    isCategoryBlocked,
    getLevelsPlayedInCategory,
    totalCategoriesUsed,
    maxFreeCategories: MAX_FREE_CATEGORIES,
    maxFreeLevelsPerCategory: MAX_FREE_LEVELS_PER_CATEGORY,
    isVip,
    loading: data.loading || vipLoading,
  };
}

export { MAX_FREE_LEVELS_PER_CATEGORY, MAX_FREE_CATEGORIES };
