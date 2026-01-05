import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeagueEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  weekly_xp: number;
  rank: number;
  league_tier: number;
  rankChange?: "up" | "down" | "same" | "new";
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
  { tier: 4, name: "Diamond League", nameKa: "ბრილიანტის ლიგა" },
  { tier: 5, name: "Champion League", nameKa: "ჩემპიონთა ლიგა" },
];

export function useLeagueLeaderboard() {
  const { user, profile } = useAuth();
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

  // Fetch or create user league data
  const { data: userLeagueData, refetch: refetchUserData } = useQuery({
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
  });

  // Fetch leaderboard for user's league tier
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leagueLeaderboard", userLeagueData?.league_tier],
    queryFn: async () => {
      const tier = userLeagueData?.league_tier || 1;

      // Get all users in this league tier with their profiles
      const { data: leagueUsers, error } = await supabase
        .from("user_league_data")
        .select(`
          user_id,
          weekly_xp,
          league_tier,
          previous_rank,
          current_rank
        `)
        .eq("league_tier", tier)
        .order("weekly_xp", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profile info for these users
      const userIds = leagueUsers?.map(u => u.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map to LeagueEntry format with ranks
      const entries: LeagueEntry[] = (leagueUsers || []).map((u, index) => {
        const profile = profileMap.get(u.user_id);
        const currentRank = index + 1;
        
        let rankChange: "up" | "down" | "same" | "new" = "same";
        if (u.previous_rank === null) {
          rankChange = "new";
        } else if (currentRank < u.previous_rank) {
          rankChange = "up";
        } else if (currentRank > u.previous_rank) {
          rankChange = "down";
        }

        return {
          user_id: u.user_id,
          nickname: profile?.nickname || "Unknown",
          avatar_url: profile?.avatar_url || null,
          weekly_xp: u.weekly_xp,
          rank: currentRank,
          league_tier: u.league_tier,
          rankChange,
        };
      });

      return entries;
    },
    enabled: !!userLeagueData,
  });

  // Update rank tracking when user visits
  useEffect(() => {
    if (!user?.id || !leaderboard || hasAnimated.current) return;

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
      // First time visiting, just set the current rank
      supabase
        .from("user_league_data")
        .update({ 
          current_rank: currentRank,
          previous_rank: currentRank,
          last_visited_at: new Date().toISOString()
        })
        .eq("user_id", user.id);
    }
  }, [user?.id, leaderboard, userLeagueData]);

  // Sync XP from profile
  useEffect(() => {
    if (!user?.id || !profile?.total_points) return;

    const syncXp = async () => {
      await supabase
        .from("user_league_data")
        .update({ 
          weekly_xp: profile.total_points,
          current_xp: profile.total_points 
        })
        .eq("user_id", user.id);
      
      queryClient.invalidateQueries({ queryKey: ["leagueLeaderboard"] });
    };

    syncXp();
  }, [profile?.total_points, user?.id, queryClient]);

  const currentLeague = LEAGUES.find(l => l.tier === (userLeagueData?.league_tier || 1)) || LEAGUES[0];
  const userEntry = leaderboard?.find(e => e.user_id === user?.id);

  return {
    leaderboard: leaderboard || [],
    isLoading,
    userLeagueData,
    currentLeague,
    userEntry,
    previousRank,
    rankChange,
    daysLeft: getDaysLeft(),
  };
}
