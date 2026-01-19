import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TriviaLeaderboardEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  score: number;
  played_at: string;
  rank: number;
}

export interface TriviaStats {
  uniquePlayers: number;
  avgScore: number;
  highestScore: number;
}

export interface TriviaDetails {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  cover_image: string | null;
  cover_gradient: string;
  question_count: number;
  plays_count: number;
  likes_count: number;
  saves_count: number;
  is_public: boolean;
  created_at: string;
  user_id: string;
  hashtags: string[];
  questions: any[];
}

export interface CreatorProfile {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
}

const CACHE_OPTIONS = {
  staleTime: 30000, // 30 seconds
  gcTime: 5 * 60 * 1000, // 5 minutes
};

export function useTriviaLobby(triviaId: string | undefined) {
  const { user } = useAuth();

  // Fetch trivia details WITH creator profile in one query (eliminates waterfall)
  const { data: triviaWithCreator, isLoading: isLoadingTrivia } = useQuery({
    queryKey: ["trivia-details-with-creator", triviaId],
    queryFn: async () => {
      if (!triviaId) return null;

      // Fetch trivia
      const { data: trivia, error } = await supabase
        .from("user_quiz_posts")
        .select("*")
        .eq("id", triviaId)
        .single();

      if (error) throw error;

      // Fetch creator profile in parallel (same function, combined result)
      const { data: creator } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .eq("user_id", trivia.user_id)
        .single();

      return { trivia: trivia as TriviaDetails, creator: creator as CreatorProfile | null };
    },
    enabled: !!triviaId,
    ...CACHE_OPTIONS,
  });

  const trivia = triviaWithCreator?.trivia;
  const creator = triviaWithCreator?.creator;

  // Fetch leaderboard - two-step approach to avoid FK join issues
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["trivia-leaderboard", triviaId],
    queryFn: async () => {
      if (!triviaId) return [];

      // Step 1: Get plays
      const { data: plays, error: playsError } = await supabase
        .from("quiz_post_plays")
        .select("user_id, score, played_at")
        .eq("post_id", triviaId)
        .order("score", { ascending: false })
        .order("played_at", { ascending: true })
        .limit(20);

      if (playsError) throw playsError;
      if (!plays || plays.length === 0) return [];

      // Step 2: Get unique user profiles in one query
      const userIds = [...new Set(plays.map(p => p.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Step 3: Merge and rank
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const entries: TriviaLeaderboardEntry[] = plays.map((entry, index) => ({
        user_id: entry.user_id,
        nickname: profileMap.get(entry.user_id)?.nickname || "მოთამაშე",
        avatar_url: profileMap.get(entry.user_id)?.avatar_url || null,
        score: entry.score || 0,
        played_at: entry.played_at,
        rank: index + 1,
      }));

      return entries;
    },
    enabled: !!triviaId,
    ...CACHE_OPTIONS,
  });

  // Fetch stats with caching
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["trivia-stats", triviaId],
    queryFn: async (): Promise<TriviaStats> => {
      if (!triviaId) return { uniquePlayers: 0, avgScore: 0, highestScore: 0 };

      const { data, error } = await supabase
        .from("quiz_post_plays")
        .select("user_id, score")
        .eq("post_id", triviaId);

      if (error) throw error;

      const plays = data || [];
      if (plays.length === 0) return { uniquePlayers: 0, avgScore: 0, highestScore: 0 };

      const uniqueUsers = new Set(plays.map(p => p.user_id));
      const scores = plays.map(p => p.score || 0);

      return {
        uniquePlayers: uniqueUsers.size,
        avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        highestScore: Math.max(...scores),
      };
    },
    enabled: !!triviaId,
    ...CACHE_OPTIONS,
  });

  // Check if current user has played (with caching)
  const { data: userPlay } = useQuery({
    queryKey: ["trivia-user-play", triviaId, user?.id],
    queryFn: async () => {
      if (!triviaId || !user?.id) return null;

      const { data, error } = await supabase
        .from("quiz_post_plays")
        .select("*")
        .eq("post_id", triviaId)
        .eq("user_id", user.id)
        .order("played_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!triviaId && !!user?.id,
    ...CACHE_OPTIONS,
  });

  // Find user's rank in leaderboard
  const userRank = user?.id
    ? leaderboard.find(entry => entry.user_id === user.id)
    : null;

  return {
    trivia,
    creator,
    leaderboard,
    stats: stats || { uniquePlayers: 0, avgScore: 0, highestScore: 0 },
    userPlay,
    userRank,
    isLoading: isLoadingTrivia || isLoadingLeaderboard || isLoadingStats,
    refetchLeaderboard,
  };
}
