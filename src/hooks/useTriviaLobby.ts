import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import mascotAvatar1 from "@/assets/avatars/mascot-avatar-1.png";
import mascotAvatar2 from "@/assets/avatars/mascot-avatar-2.png";
import mascotAvatar3 from "@/assets/avatars/mascot-avatar-3.png";
import mascotAvatar4 from "@/assets/avatars/mascot-avatar-4.png";
import mascotAvatar5 from "@/assets/avatars/mascot-avatar-5.png";
import mascotAvatar6 from "@/assets/avatars/mascot-avatar-6.png";
import mascotAvatar7 from "@/assets/avatars/mascot-avatar-7.png";
import mascotAvatar8 from "@/assets/avatars/mascot-avatar-8.png";
import { useLanguage } from "@/contexts/LanguageContext";

const FAKE_AVATARS = [
  mascotAvatar1, mascotAvatar2, mascotAvatar3, mascotAvatar4,
  mascotAvatar5, mascotAvatar6, mascotAvatar7, mascotAvatar8,
];

const FAKE_NAMES = [
  "Giorgi K.", "Mariami G.", "Nika T.", "Ana B.", "Daviti M.",
  "Elene S.", "Luka Ch.", "Tamari P.", "Nino R.", "Alexandre D.",
];

function generateFakeTriviaLeaderboard(triviaId: string, questionCount: number): TriviaLeaderboardEntry[] {
  // Seed based on triviaId for consistency
  const seed = triviaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seededRandom = (i: number) => {
    const x = Math.sin(seed * 100 + i * 37) * 10000;
    return x - Math.floor(x);
  };

  const count = 3 + Math.floor(seededRandom(99) * 5); // 3-7 fake users
  const now = Date.now();

  const entries: TriviaLeaderboardEntry[] = Array.from({ length: count }, (_, i) => {
    // Scores: first user gets high score, decreasing
    const maxScore = questionCount;
    const score = Math.max(1, Math.round(maxScore * (0.5 + seededRandom(i) * 0.5) - i * 0.5));
    const hoursAgo = 1 + Math.floor(seededRandom(i + 50) * 72); // 1-72 hours ago

    return {
      user_id: `fake-trivia-${triviaId.slice(0, 8)}-${i}`,
      nickname: FAKE_NAMES[i % FAKE_NAMES.length],
      avatar_url: FAKE_AVATARS[i % FAKE_AVATARS.length],
      score: Math.min(score, maxScore),
      played_at: new Date(now - hoursAgo * 3600000).toISOString(),
      rank: 0,
    };
  });

  // Sort by score desc
  entries.sort((a, b) => b.score - a.score || new Date(a.played_at).getTime() - new Date(b.played_at).getTime());
  entries.forEach((e, i) => e.rank = i + 1);

  return entries;
}

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
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
  // Shows only BEST score per user (de-duplicated)
  const { data: realLeaderboard = [], isLoading: isLoadingLeaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["trivia-leaderboard", triviaId],
    queryFn: async () => {
      if (!triviaId) return [];

      // Step 1: Get ALL plays for this trivia (no limit - we'll filter in JS)
      const { data: allPlays, error: playsError } = await supabase
        .from("quiz_post_plays")
        .select("user_id, score, played_at")
        .eq("post_id", triviaId);

      if (playsError) throw playsError;
      if (!allPlays || allPlays.length === 0) return [];

      // Step 2: Group by user and keep only BEST score per user
      const bestByUser = new Map<string, { user_id: string; score: number; played_at: string }>();
      for (const play of allPlays) {
        const existing = bestByUser.get(play.user_id);
        if (!existing || (play.score || 0) > (existing.score || 0)) {
          bestByUser.set(play.user_id, play);
        }
      }

      // Step 3: Sort by score desc, then by played_at asc, limit to top 20
      const plays = Array.from(bestByUser.values())
        .sort((a, b) => {
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          return new Date(a.played_at).getTime() - new Date(b.played_at).getTime();
        })
        .slice(0, 20);

      // Step 4: Get unique user profiles in one query
      const userIds = plays.map(p => p.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Step 5: Merge and rank
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const entries: TriviaLeaderboardEntry[] = plays.map((entry, index) => ({
        user_id: entry.user_id,
        nickname: profileMap.get(entry.user_id)?.nickname || t("extra.defaultPlayerName"),
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

  // Merge real leaderboard with fake entries when empty
  const leaderboard = useMemo(() => {
    if (realLeaderboard.length > 0) return realLeaderboard;
    if (!triviaId || !trivia) return [];
    // Don't show fake entries on the creator's own trivia
    if (user?.id && trivia.user_id === user.id) return [];
    return generateFakeTriviaLeaderboard(triviaId, trivia.question_count || 10);
  }, [realLeaderboard, triviaId, trivia, user?.id]);

  // Find user's rank in leaderboard
  const userRank = user?.id
    ? leaderboard.find(entry => entry.user_id === user.id)
    : null;

  // Remove current user from leaderboard (delete all their plays for this trivia)
  const removeFromLeaderboard = async () => {
    if (!triviaId || !user?.id) return;

    const { error } = await supabase
      .from("quiz_post_plays")
      .delete()
      .eq("post_id", triviaId)
      .eq("user_id", user.id);

    if (error) throw error;

    // Invalidate all related queries so the UI updates immediately
    queryClient.invalidateQueries({ queryKey: ["trivia-leaderboard", triviaId] });
    queryClient.invalidateQueries({ queryKey: ["trivia-stats", triviaId] });
    queryClient.invalidateQueries({ queryKey: ["trivia-user-play", triviaId, user.id] });
  };

  return {
    trivia,
    creator,
    leaderboard,
    stats: stats || { uniquePlayers: 0, avgScore: 0, highestScore: 0 },
    userPlay,
    userRank,
    isLoading: isLoadingTrivia || isLoadingLeaderboard || isLoadingStats,
    refetchLeaderboard,
    removeFromLeaderboard,
  };
}
