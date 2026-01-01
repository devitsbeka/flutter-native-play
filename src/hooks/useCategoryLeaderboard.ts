import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  category_id: string;
  total_score: number;
  games_played: number;
  best_streak: number;
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

      // Get leaderboard entries with profile info
      const { data, error } = await supabase
        .from("category_leaderboard")
        .select(`
          id,
          user_id,
          category_id,
          total_score,
          games_played,
          best_streak
        `)
        .eq("category_id", categoryId)
        .order("total_score", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
      }

      // Get profile info for all users
      const userIds = data.map((entry) => entry.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, country_code")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) || []
      );

      // Combine data with ranks
      return data.map((entry, index) => {
        const profile = profileMap.get(entry.user_id);
        return {
          ...entry,
          rank: index + 1,
          nickname: profile?.nickname || "მოთამაშე",
          avatar_url: profile?.avatar_url || null,
          country_code: profile?.country_code || null,
        };
      });
    },
    enabled: !!categoryId,
    staleTime: 30000, // 30 seconds
  });

  // Find current user's position
  const userEntry = user
    ? leaderboard.find((entry) => entry.user_id === user.id)
    : null;

  // If user is not in top 100, fetch their actual rank
  const { data: userRank } = useQuery({
    queryKey: ["user-category-rank", categoryId, user?.id],
    queryFn: async () => {
      if (!categoryId || !user) return null;

      // First get user's score
      const { data: userScore } = await supabase
        .from("category_leaderboard")
        .select("total_score")
        .eq("category_id", categoryId)
        .eq("user_id", user.id)
        .single();

      if (!userScore) return null;

      // Count how many users have higher scores
      const { count } = await supabase
        .from("category_leaderboard")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId)
        .gt("total_score", userScore.total_score);

      return {
        rank: (count || 0) + 1,
        total_score: userScore.total_score,
      };
    },
    enabled: !!categoryId && !!user && !userEntry,
  });

  return {
    leaderboard,
    isLoading,
    userEntry,
    userRank: userEntry ? { rank: userEntry.rank, total_score: userEntry.total_score } : userRank,
  };
}
