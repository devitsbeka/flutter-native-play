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

export function useTriviaLobby(triviaId: string | undefined) {
  const { user } = useAuth();

  // Fetch trivia details
  const { data: trivia, isLoading: isLoadingTrivia } = useQuery({
    queryKey: ["trivia-details", triviaId],
    queryFn: async () => {
      if (!triviaId) return null;

      const { data, error } = await supabase
        .from("user_quiz_posts")
        .select("*")
        .eq("id", triviaId)
        .single();

      if (error) throw error;
      return data as TriviaDetails;
    },
    enabled: !!triviaId,
  });

  // Fetch creator profile
  const { data: creator, isLoading: isLoadingCreator } = useQuery({
    queryKey: ["trivia-creator", trivia?.user_id],
    queryFn: async () => {
      if (!trivia?.user_id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .eq("user_id", trivia.user_id)
        .single();

      if (error) throw error;
      return data as CreatorProfile;
    },
    enabled: !!trivia?.user_id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["trivia-leaderboard", triviaId],
    queryFn: async () => {
      if (!triviaId) return [];

      const { data, error } = await supabase
        .from("quiz_post_plays")
        .select(`
          user_id,
          score,
          played_at,
          profiles:user_id (
            nickname,
            avatar_url
          )
        `)
        .eq("post_id", triviaId)
        .order("score", { ascending: false })
        .order("played_at", { ascending: true })
        .limit(20);

      if (error) throw error;

      // Transform and add ranks
      const entries: TriviaLeaderboardEntry[] = (data || []).map((entry: any, index: number) => ({
        user_id: entry.user_id,
        nickname: entry.profiles?.nickname || "მოთამაშე",
        avatar_url: entry.profiles?.avatar_url,
        score: entry.score || 0,
        played_at: entry.played_at,
        rank: index + 1,
      }));

      return entries;
    },
    enabled: !!triviaId,
  });

  // Fetch stats
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
      const uniqueUsers = new Set(plays.map(p => p.user_id));
      const scores = plays.map(p => p.score || 0);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

      return {
        uniquePlayers: uniqueUsers.size,
        avgScore: Math.round(avgScore * 10) / 10,
        highestScore,
      };
    },
    enabled: !!triviaId,
  });

  // Check if current user has played
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
    isLoading: isLoadingTrivia || isLoadingCreator || isLoadingLeaderboard || isLoadingStats,
    refetchLeaderboard,
  };
}
