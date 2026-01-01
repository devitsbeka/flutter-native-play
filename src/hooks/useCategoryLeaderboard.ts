import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardEntry {
  user_id: string;
  total_stars: number;
  levels_completed: number;
  rank: number;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
}

export function useCategoryLeaderboard(categoryId: string | undefined) {
  const { user } = useAuth();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["category-leaderboard", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      // Get all level progress for this category - aggregate by user
      const { data: progressData, error } = await supabase
        .from("user_level_progress")
        .select("user_id, stars_earned, level_number")
        .eq("category_id", categoryId);

      if (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
      }

      if (!progressData || progressData.length === 0) {
        return [];
      }

      // Aggregate by user_id
      const userStats = new Map<string, { total_stars: number; levels_completed: number }>();
      
      progressData.forEach((record) => {
        const existing = userStats.get(record.user_id) || { total_stars: 0, levels_completed: 0 };
        userStats.set(record.user_id, {
          total_stars: existing.total_stars + (record.stars_earned || 0),
          levels_completed: existing.levels_completed + 1,
        });
      });

      // Get unique user IDs
      const userIds = Array.from(userStats.keys());

      // Get profile info for all users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, country_code")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) || []
      );

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = userIds.map((userId) => {
        const stats = userStats.get(userId)!;
        const profile = profileMap.get(userId);
        return {
          user_id: userId,
          total_stars: stats.total_stars,
          levels_completed: stats.levels_completed,
          rank: 0, // Will be set after sorting
          nickname: profile?.nickname || "მოთამაშე",
          avatar_url: profile?.avatar_url || null,
          country_code: profile?.country_code || null,
        };
      });

      // Sort by total stars (descending), then by levels completed
      entries.sort((a, b) => {
        if (b.total_stars !== a.total_stars) {
          return b.total_stars - a.total_stars;
        }
        return b.levels_completed - a.levels_completed;
      });

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return entries.slice(0, 100); // Top 100
    },
    enabled: !!categoryId,
    staleTime: 30000, // 30 seconds
  });

  // Find current user's entry
  const userEntry = user
    ? leaderboard.find((entry) => entry.user_id === user.id)
    : null;

  // If user is not in top 100, fetch their actual rank
  const { data: userRank } = useQuery({
    queryKey: ["user-category-rank", categoryId, user?.id],
    queryFn: async () => {
      if (!categoryId || !user) return null;

      // Get user's stars for this category
      const { data: userProgress } = await supabase
        .from("user_level_progress")
        .select("stars_earned")
        .eq("category_id", categoryId)
        .eq("user_id", user.id);

      if (!userProgress || userProgress.length === 0) return null;

      const userTotalStars = userProgress.reduce((sum, p) => sum + (p.stars_earned || 0), 0);

      // Count users with more stars
      const { data: allProgress } = await supabase
        .from("user_level_progress")
        .select("user_id, stars_earned")
        .eq("category_id", categoryId);

      if (!allProgress) return null;

      // Aggregate all users
      const userStarsMap = new Map<string, number>();
      allProgress.forEach((p) => {
        const current = userStarsMap.get(p.user_id) || 0;
        userStarsMap.set(p.user_id, current + (p.stars_earned || 0));
      });

      // Count users with higher stars
      let higherCount = 0;
      userStarsMap.forEach((stars, userId) => {
        if (userId !== user.id && stars > userTotalStars) {
          higherCount++;
        }
      });

      return {
        rank: higherCount + 1,
        total_stars: userTotalStars,
        levels_completed: userProgress.length,
      };
    },
    enabled: !!categoryId && !!user && !userEntry,
  });

  return {
    leaderboard,
    isLoading,
    userEntry,
    userRank: userEntry 
      ? { rank: userEntry.rank, total_stars: userEntry.total_stars, levels_completed: userEntry.levels_completed } 
      : userRank,
  };
}
