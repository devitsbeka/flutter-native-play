import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook to get the user's leaderboard rank for all categories they've played.
 * Returns a map of categoryId -> rank.
 *
 * NOTE: This downloads aggregated progress for ranking.  The query is expensive
 * so we cache aggressively (10 min staleTime, 15 min gcTime).
 */
export function useUserCategoryRanks() {
  const { user } = useAuth();

  const { data: ranks = {}, isLoading } = useQuery({
    queryKey: ["user-category-ranks", user?.id],
    queryFn: async () => {
      if (!user) return {};

      // 1. Get the current user's own progress first so we know which categories to rank
      const { data: myProgress, error: myError } = await supabase
        .from("user_level_progress")
        .select("category_id, stars_earned")
        .eq("user_id", user.id);

      if (myError || !myProgress || myProgress.length === 0) return {};

      // Aggregate user's own stars per category
      const myStarsPerCategory = new Map<string, number>();
      myProgress.forEach((r) => {
        myStarsPerCategory.set(
          r.category_id,
          (myStarsPerCategory.get(r.category_id) || 0) + (r.stars_earned || 0)
        );
      });

      const myCategoryIds = [...myStarsPerCategory.keys()];
      if (myCategoryIds.length === 0) return {};

      // 2. For each category the user played, count how many users scored higher.
      //    We fetch only the categories the user has played (not the entire table).
      const { data: relevantProgress, error } = await supabase
        .from("user_level_progress")
        .select("user_id, category_id, stars_earned")
        .in("category_id", myCategoryIds);

      if (error || !relevantProgress) return {};

      // Aggregate stars by user+category
      const categoryUserStars = new Map<string, Map<string, number>>();
      relevantProgress.forEach((record) => {
        if (!categoryUserStars.has(record.category_id)) {
          categoryUserStars.set(record.category_id, new Map());
        }
        const userStars = categoryUserStars.get(record.category_id)!;
        userStars.set(
          record.user_id,
          (userStars.get(record.user_id) || 0) + (record.stars_earned || 0)
        );
      });

      // Calculate rank for current user in each category
      const userRanks: Record<string, number> = {};
      categoryUserStars.forEach((userStars, categoryId) => {
        const currentUserStars = userStars.get(user.id);
        if (currentUserStars === undefined) return;

        let higherCount = 0;
        userStars.forEach((stars, userId) => {
          if (userId !== user.id && stars > currentUserStars) {
            higherCount++;
          }
        });

        userRanks[categoryId] = higherCount + 1;
      });

      return userRanks;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,  // 10 minutes — ranks don't change frequently
    gcTime: 15 * 60 * 1000,     // 15 minutes garbage collection
  });

  return { ranks, isLoading };
}
