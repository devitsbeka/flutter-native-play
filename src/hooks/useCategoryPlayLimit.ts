import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import { categoryTier, playableLevels, type CategoryTier } from "@/utils/categoryAccess";

/**
 * What a category allows without PRO now comes from its tier — free is
 * unlimited, standard is one level, premium is none — so there is no single
 * number here any more. `levelsAllowedIn(categoryId)` is the replacement.
 *
 * The old rule was a flat three levels in each of at most five categories.
 * The five-category cap goes with it: "one level in each" and "only five
 * categories" are different promises, and the one being asked for is the
 * first. Someone browsing forty categories now gets a level in each rather
 * than a wall on the sixth.
 */

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
   * How deep this player may go in this category. Infinity for PRO and for
   * the free categories; 1 for an ordinary one; 0 for a premium one.
   *
   * Takes the slug, because that is what every caller has. `categoryTier`
   * falls back to its own premium list when the row's `is_premium` is not
   * available — and here it never is, since this hook reads
   * `user_level_progress`, not `categories`.
   */
  const levelsAllowedIn = useCallback(
    (categoryId: string): number => playableLevels({ category_id: categoryId }, isVip),
    [isVip]
  );

  const tierOf = useCallback(
    (categoryId: string): CategoryTier => categoryTier({ category_id: categoryId }),
    []
  );

  /**
   * Whether this player may open this level.
   *
   * A level they have already finished is always replayable — losing access
   * to something you have completed reads as the app taking it back, and it
   * is how the star total is topped up.
   */
  const canPlayLevel = useCallback(
    (categoryId: string, levelNumber?: number): boolean => {
      if (isVip) return true;
      if (!user) return true; // Guests handled separately by auth gates

      if (levelNumber !== undefined && data.categoriesPlayed.get(categoryId)?.has(levelNumber)) {
        return true;
      }

      const allowance = levelsAllowedIn(categoryId);
      if (allowance === 0) return false;

      // Which level, when the caller says. Level 3 is out of reach on a
      // one-level allowance however few levels have actually been played —
      // the old rule counted plays instead, so finishing level 1 and coming
      // back tomorrow to level 5 was permitted.
      if (levelNumber !== undefined) return levelNumber <= allowance;

      return getLevelsPlayedInCategory(categoryId) < allowance;
    },
    [isVip, user, data.categoriesPlayed, levelsAllowedIn, getLevelsPlayedInCategory]
  );

  /**
   * The category is shut altogether — a premium one without PRO. Nothing
   * else blocks a whole category any more; a standard one always has its
   * first level.
   */
  const isCategoryBlocked = useCallback(
    (categoryId: string): boolean => levelsAllowedIn(categoryId) === 0,
    [levelsAllowedIn]
  );

  return {
    canPlayLevel,
    isCategoryBlocked,
    getLevelsPlayedInCategory,
    levelsAllowedIn,
    tierOf,
    totalCategoriesUsed,
    isVip,
    loading: data.loading || vipLoading,
  };
}
