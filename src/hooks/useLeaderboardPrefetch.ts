import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// AI user names for each league tier
const AI_NAMES: Record<number, string[]> = {
  1: ["ნიკა", "მარიამი", "გიორგი", "ანა", "დავით", "ელენე", "ლუკა", "სოფო", "ალექსი", "თეა", "ბექა", "ნინო"],
  2: ["kiyo", "Uyên Lê", "りゅう", "Ayşe", "秋草勇士郎", "Hải Dương", "Marco", "李明", "София", "Ahmed"],
  3: ["Sarah_M", "TechWiz", "QuizPro", "GameMaster", "StarPlayer", "TopGun", "Ninja99", "Eagle", "Phoenix", "Thunder"],
  4: ["Champion1", "ProPlayer", "LeaderX", "MasterMind", "Genius", "BrainPower", "QuizKing", "TopRank", "Elite", "Legend"],
  5: ["WorldChamp", "Ultimate", "Supreme", "Invincible", "TheOne", "Godlike", "Unstoppable", "Legendary", "Mythical", "Eternal"],
};

// Generate fake users for a league tier
// AI users should ALWAYS have fewer coins than the lowest real user
function generateFakeUsers(tier: number, count: number = 15, lowestRealUserCoins?: number) {
  const names = AI_NAMES[tier] || AI_NAMES[1];
  
  // AI users get coins BELOW the lowest real user (or tier-appropriate defaults if no real users)
  const maxAiCoins = lowestRealUserCoins 
    ? Math.max(lowestRealUserCoins - 1, 100) 
    : (tier === 3 ? 9000 : tier === 2 ? 2500 : 1500);
  const minAiCoins = tier === 3 ? 5000 : tier === 2 ? 1000 : 200;
  
  const seededRandom = (i: number) => {
    const x = Math.sin(tier * 1000 + i) * 10000;
    return x - Math.floor(x);
  };
  
  return Array.from({ length: count }, (_, i) => {
    // Spread AI users across the range, with higher indices getting lower coins
    const positionFactor = 1 - (i / count); // First AI user gets more coins
    const coins = Math.floor(minAiCoins + seededRandom(i) * (maxAiCoins - minAiCoins) * positionFactor);
    
    return {
      user_id: `ai-${tier}-${i}`,
      nickname: names[i % names.length] + (i >= names.length ? `_${Math.floor(i / names.length)}` : ""),
      avatar_url: null,
      weekly_xp: coins,
      coins: coins,
      rank: i + 1,
      league_tier: tier,
      rankChange: "same" as const,
      isAI: true,
    };
  });
}

// Fast leaderboard fetch using RPC
async function fetchLeaderboardFast(tier: number, region?: string) {
  // Try the RPC function first (single optimized query)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_league_leaderboard', {
      p_tier: tier,
      p_region: region === 'global' ? null : region,
      p_limit: 50
    });

  let realEntries: any[] = [];

  if (!rpcError && rpcData && rpcData.length > 0) {
    // Use RPC data directly
    realEntries = rpcData.map((u: any) => ({
      user_id: u.user_id,
      nickname: u.nickname || "Unknown",
      avatar_url: u.avatar_url,
      weekly_xp: u.coins || 0,
      coins: u.coins || 0,
      rank: 0,
      league_tier: tier,
      rankChange: u.previous_rank === null ? "new" : "same",
      isAI: false,
    }));
  } else {
    // Fallback: fetch with two queries (but in parallel)
    const [leagueResult, profilesResult] = await Promise.all([
      supabase
        .from("user_league_data")
        .select("user_id, weekly_xp, league_tier, previous_rank, current_rank")
        .eq("league_tier", tier)
        .order("weekly_xp", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, coins, region")
        .limit(100)
    ]);

    const leagueUsers = leagueResult.data || [];
    const profiles = profilesResult.data || [];
    
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));
    
    realEntries = leagueUsers
      .filter(u => {
        const profile = profileMap.get(u.user_id);
        return !region || region === 'global' || profile?.region === region;
      })
      .map((u) => {
        const profile = profileMap.get(u.user_id);
        return {
          user_id: u.user_id,
          nickname: profile?.nickname || "Unknown",
          avatar_url: profile?.avatar_url || null,
          weekly_xp: profile?.coins || 0,
          coins: profile?.coins || 0,
          rank: 0,
          league_tier: u.league_tier,
          rankChange: u.previous_rank === null ? "new" : "same",
          isAI: false,
        };
      });
  }

  // Generate AI users to fill the league
  // They should always rank BELOW real users
  const lowestRealUserCoins = realEntries.length > 0 
    ? Math.min(...realEntries.map(e => e.coins))
    : undefined;

  const aiCount = Math.max(15, 25 - realEntries.length);
  const aiUsers = generateFakeUsers(tier, aiCount, lowestRealUserCoins);

  // Combine and sort by coins
  const allEntries = [...realEntries, ...aiUsers]
    .sort((a, b) => b.coins - a.coins)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return allEntries;
}

export function useLeaderboardPrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchLeaderboard = async (tier?: number) => {
    const tierToFetch = tier || 1;
    
    // Check if data already exists and is fresh
    const existingData = queryClient.getQueryData(["leagueLeaderboard", tierToFetch, undefined]);
    if (existingData) return; // Already cached

    // Prefetch in background
    queryClient.prefetchQuery({
      queryKey: ["leagueLeaderboard", tierToFetch, undefined],
      queryFn: () => fetchLeaderboardFast(tierToFetch),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  const prefetchAllTiers = async () => {
    // Prefetch all 3 tiers in parallel for desktop view
    await Promise.all([
      prefetchLeaderboard(1),
      prefetchLeaderboard(2),
      prefetchLeaderboard(3),
    ]);
  };

  return {
    prefetchLeaderboard,
    prefetchAllTiers,
  };
}

// Export the fetch function for use in the hook
export { fetchLeaderboardFast };
