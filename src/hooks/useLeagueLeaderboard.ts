import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeagueEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  weekly_xp: number; // Keep for backwards compat, but this is now coins or wins
  coins: number;     // New: actual coin balance
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
  { tier: 4, name: "Diamond League", nameKa: "ბრილიანტის ლიგა" },
  { tier: 5, name: "Champion League", nameKa: "ჩემპიონთა ლიგა" },
];

// AI user names for each league tier
const AI_NAMES: Record<number, string[]> = {
  1: ["ნიკა", "მარიამი", "გიორგი", "ანა", "დავით", "ელენე", "ლუკა", "სოფო", "ალექსი", "თეა", "ბექა", "ნინო"],
  2: ["kiyo", "Uyên Lê", "りゅう", "Ayşe", "秋草勇士郎", "Hải Dương", "Marco", "李明", "София", "Ahmed"],
  3: ["Sarah_M", "TechWiz", "QuizPro", "GameMaster", "StarPlayer", "TopGun", "Ninja99", "Eagle", "Phoenix", "Thunder"],
  4: ["Champion1", "ProPlayer", "LeaderX", "MasterMind", "Genius", "BrainPower", "QuizKing", "TopRank", "Elite", "Legend"],
  5: ["WorldChamp", "Ultimate", "Supreme", "Invincible", "TheOne", "Godlike", "Unstoppable", "Legendary", "Mythical", "Eternal"],
};

// Generate fake users for a league tier with seeded random for consistency
function generateFakeUsers(tier: number, count: number = 15, existingCoinsRange?: { min: number; max: number }): LeagueEntry[] {
  const names = AI_NAMES[tier] || AI_NAMES[1];
  const baseCoins = existingCoinsRange?.max || (tier * 2000 + 1000);
  const minCoins = existingCoinsRange?.min || tier * 500;
  
  // Seed random based on tier for consistent results per session
  const seededRandom = (i: number) => {
    const x = Math.sin(tier * 1000 + i) * 10000;
    return x - Math.floor(x);
  };
  
  return Array.from({ length: count }, (_, i) => ({
    user_id: `ai-${tier}-${i}`,
    nickname: names[i % names.length] + (i >= names.length ? `_${Math.floor(i / names.length)}` : ""),
    avatar_url: null,
    weekly_xp: Math.floor(minCoins + seededRandom(i) * (baseCoins - minCoins)),
    coins: Math.floor(minCoins + seededRandom(i) * (baseCoins - minCoins)),
    rank: i + 1,
    league_tier: tier,
    rankChange: "same" as const,
    isAI: true,
  }));
}

export function useLeagueLeaderboard(viewingTier?: number, region?: string) {
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
  });

  const userTier = userLeagueData?.league_tier || 1;
  const activeTier = viewingTier ?? userTier;

  // Fetch leaderboard for the viewing tier (optionally filtered by region)
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leagueLeaderboard", activeTier, region],
    queryFn: async () => {
      // For user's own tier, get league data; for other tiers, get all profiles
      let realEntries: LeagueEntry[] = [];
      
      if (activeTier === userTier || !user?.id) {
        // Get users from user_league_data for the active tier
        const { data: leagueUsers, error } = await supabase
          .from("user_league_data")
          .select(`
            user_id,
            weekly_xp,
            league_tier,
            previous_rank,
            current_rank
          `)
          .eq("league_tier", activeTier)
          .order("weekly_xp", { ascending: false })
          .limit(50);

        if (error) throw error;

        // Get profile info for real users (optionally filtered by region)
        const userIds = leagueUsers?.map(u => u.user_id) || [];
        let profileQuery = supabase
          .from("profiles")
          .select("user_id, nickname, avatar_url, coins, region")
          .in("user_id", userIds);
        
        // Filter by region if not global
        if (region && region !== 'global') {
          profileQuery = profileQuery.eq("region", region);
        }
        
        const { data: profiles } = await profileQuery;

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Map real users - rank by coins now
        realEntries = (leagueUsers || []).map((u) => {
          const profile = profileMap.get(u.user_id);
          const userCoins = profile?.coins || 0;
          
          let rankChangeStatus: "up" | "down" | "same" | "new" = "same";
          if (u.previous_rank === null) {
            rankChangeStatus = "new";
          }

          return {
            user_id: u.user_id,
            nickname: profile?.nickname || "Unknown",
            avatar_url: profile?.avatar_url || null,
            weekly_xp: userCoins, // Use coins for sorting
            coins: userCoins,
            rank: 0,
            league_tier: u.league_tier,
            rankChange: rankChangeStatus,
            isAI: false,
          };
        });
      } else {
        // For other tiers (locked tiers), fetch real profiles and distribute them
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("user_id, nickname, avatar_url, coins")
          .order("coins", { ascending: false })
          .limit(100);

        if (allProfiles && allProfiles.length > 0) {
          // Distribute profiles across tiers based on coins
          const tierRanges = [
            { tier: 1, minCoins: 0, maxCoins: 2000 },
            { tier: 2, minCoins: 2000, maxCoins: 5000 },
            { tier: 3, minCoins: 5000, maxCoins: 15000 },
            { tier: 4, minCoins: 15000, maxCoins: 50000 },
            { tier: 5, minCoins: 50000, maxCoins: Infinity },
          ];
          
          const tierRange = tierRanges.find(t => t.tier === activeTier);
          if (tierRange) {
            realEntries = allProfiles
              .filter(p => (p.coins || 0) >= tierRange.minCoins && (p.coins || 0) < tierRange.maxCoins)
              .slice(0, 10)
              .map((p) => ({
                user_id: p.user_id,
                nickname: p.nickname,
                avatar_url: p.avatar_url,
                weekly_xp: p.coins || 0,
                coins: p.coins || 0,
                rank: 0,
                league_tier: activeTier,
                rankChange: "same" as const,
                isAI: false,
              }));
          }
        }
      }

      // Calculate coins range for AI users
      const existingCoinsRange = realEntries.length > 0 
        ? { 
            min: Math.min(...realEntries.map(e => e.coins), 500),
            max: Math.max(...realEntries.map(e => e.coins), 3000)
          }
        : undefined;

      // Generate AI users to fill the league (ensure 20-30 total)
      const aiCount = Math.max(15, 25 - realEntries.length);
      const aiUsers = generateFakeUsers(activeTier, aiCount, existingCoinsRange);

      // Combine and sort by coins
      const allEntries = [...realEntries, ...aiUsers]
        .sort((a, b) => b.coins - a.coins)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      return allEntries;
    },
    enabled: true,
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

  const currentLeague = LEAGUES.find(l => l.tier === activeTier) || LEAGUES[0];
  const userEntry = leaderboard?.find(e => e.user_id === user?.id);

  return {
    leaderboard: leaderboard || [],
    isLoading,
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
