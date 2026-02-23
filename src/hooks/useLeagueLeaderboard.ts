import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchLeaderboardFast } from "./useLeaderboardPrefetch";

export interface LeagueEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  weekly_xp: number;
  coins: number;
  rank: number;
  league_tier: number;
  rankChange?: "up" | "down" | "same" | "new";
  isAI?: boolean;
}

export interface LeagueInfo {
  tier: number;
  name: string;
  nameKa: string;
}

export const LEAGUES: LeagueInfo[] = [
  { tier: 1, name: "Bronze League", nameKa: "ბრინჯაოს ლიგა" },
  { tier: 2, name: "Silver League", nameKa: "ვერცხლის ლიგა" },
  { tier: 3, name: "Gold League", nameKa: "ოქროს ლიგა" },
];

export function useLeagueLeaderboard(viewingTier?: number, region?: string) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [previousRank, setPreviousRank] = useState<number | null>(null);
  const [rankChange, setRankChange] = useState<number>(0);
  const hasAnimated = useRef(false);

  // Get current week start date
  const getWeekStartDate = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString().split('T')[0];
  };

  // Calculate days left in the week
  const getDaysLeft = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    return daysUntilSunday;
  };

  // Fetch or create user league data - with longer cache
  const { data: userLeagueData } = useQuery({
    queryKey: ["userLeagueData", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const weekStart = getWeekStartDate();

      // Try to get existing data
      let { data, error } = await supabase
        .from("user_league_data")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // No data exists, create it
        const { data: newData, error: insertError } = await supabase
          .from("user_league_data")
          .insert({
            user_id: user.id,
            league_tier: 1,
            weekly_xp: profile?.total_points || 0,
            current_xp: profile?.total_points || 0,
            week_start_date: weekStart,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newData;
      } else if (error) {
        throw error;
      }

      // Check if week has reset
      if (data && data.week_start_date !== weekStart) {
        // Reset weekly XP for new week
        const { data: updatedData, error: updateError } = await supabase
          .from("user_league_data")
          .update({
            weekly_xp: 0,
            week_start_date: weekStart,
            previous_rank: data.current_rank,
          })
          .eq("user_id", user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        data = updatedData;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes - user tier rarely changes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const userTier = userLeagueData?.league_tier || 1;
  const activeTier = viewingTier ?? userTier;

  // Fetch leaderboard using the optimized function
  const { data: leaderboard, isLoading, isFetching } = useQuery({
    queryKey: ["leagueLeaderboard", activeTier, region, language],
    queryFn: () => fetchLeaderboardFast(activeTier, region, language),
    enabled: true,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // Update rank tracking when user visits their own league
  useEffect(() => {
    if (!user?.id || !leaderboard || hasAnimated.current || viewingTier !== undefined) return;

    const userEntry = leaderboard.find(e => e.user_id === user.id);
    if (!userEntry) return;

    const storedPreviousRank = userLeagueData?.previous_rank;
    const currentRank = userEntry.rank;

    if (storedPreviousRank && storedPreviousRank !== currentRank) {
      setPreviousRank(storedPreviousRank);
      setRankChange(storedPreviousRank - currentRank);
      hasAnimated.current = true;

      // Update the stored rank after animation
      setTimeout(async () => {
        await supabase
          .from("user_league_data")
          .update({ 
            current_rank: currentRank,
            previous_rank: currentRank,
            last_visited_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
      }, 2000);
    } else if (!storedPreviousRank) {
      supabase
        .from("user_league_data")
        .update({ 
          current_rank: currentRank,
          previous_rank: currentRank,
          last_visited_at: new Date().toISOString()
        })
        .eq("user_id", user.id);
    }
  }, [user?.id, leaderboard, userLeagueData, viewingTier]);

  // Sync XP from profile + auto-promote tier based on coins
  const lastSyncedPoints = useRef<number | null>(null);
  
  useEffect(() => {
    if (!user?.id || !profile?.total_points) return;
    if (lastSyncedPoints.current === profile.total_points) return;
    
    const syncXp = async () => {
      lastSyncedPoints.current = profile.total_points;
      
      // Determine correct tier based on coins
      const coins = profile.coins ?? 0;
      const correctTier = coins > 9000 ? 3 : coins > 3500 ? 2 : 1;
      
      await supabase
        .from("user_league_data")
        .update({ 
          weekly_xp: profile.total_points,
          current_xp: profile.total_points,
          ...(correctTier !== userTier ? { league_tier: correctTier } : {}),
        })
        .eq("user_id", user.id);
      
      // Invalidate cache if tier changed
      if (correctTier !== userTier) {
        queryClient.invalidateQueries({ queryKey: ["userLeagueData"] });
        queryClient.invalidateQueries({ queryKey: ["leagueLeaderboard"] });
      }
    };

    syncXp();
  }, [profile?.total_points, profile?.coins, user?.id, userTier, queryClient]);

  const currentLeague = LEAGUES.find(l => l.tier === activeTier) || LEAGUES[0];
  const userEntry = leaderboard?.find(e => e.user_id === user?.id);

  return {
    leaderboard: leaderboard || [],
    isLoading: isLoading && !leaderboard, // Only show loading if no cached data
    isFetching,
    userLeagueData,
    userTier,
    currentLeague,
    userEntry,
    previousRank,
    rankChange,
    daysLeft: getDaysLeft(),
    isViewingOwnLeague: viewingTier === undefined || viewingTier === userTier,
    isLeagueLocked: activeTier > userTier,
  };
}
