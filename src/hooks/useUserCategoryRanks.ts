import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook to get the user's leaderboard rank for all categories they've played
 * Returns a map of categoryId -> rank
 */
export function useUserCategoryRanks() {
  const { user } = useAuth();

  const { data: ranks = {}, isLoading } = useQuery({
    queryKey: ["user-category-ranks", user?.id],
    queryFn: async () => {
      if (!user) return {};

      // Get all level progress to find which categories user has played
      const { data: allProgress, error } = await supabase
        .from("user_level_progress")
        .select("user_id, category_id, stars_earned");

      if (error || !allProgress) {
        console.error("Error fetching category ranks:", error);
        return {};
      }

      // Aggregate stars by user and category
      const categoryUserStars = new Map<string, Map<string, number>>();
      
      allProgress.forEach((record) => {
        if (!categoryUserStars.has(record.category_id)) {
          categoryUserStars.set(record.category_id, new Map());
        }
        const userStars = categoryUserStars.get(record.category_id)!;
        const current = userStars.get(record.user_id) || 0;
        userStars.set(record.user_id, current + (record.stars_earned || 0));
      });

      // Calculate rank for current user in each category they've played
      const userRanks: Record<string, number> = {};

      categoryUserStars.forEach((userStars, categoryId) => {
        const currentUserStars = userStars.get(user.id);
        if (currentUserStars === undefined) return;

        // Count users with more stars
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
    staleTime: 30000, // Cache for 30 seconds
  });

  return { ranks, isLoading };
}
