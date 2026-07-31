import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { callRpc } from "@/integrations/supabase/rpc";

export interface PurchaseTransaction {
  id: string;
  user_id: string | null;
  product_id: string | null;
  product_type: string;
  currency_used: string;
  amount_paid: number;
  value_received: Json;
  platform: string | null;
  created_at: string | null;
  profile?: {
    nickname: string;
    avatar_url: string | null;
  } | null;
}

export interface PurchaseStats {
  totalTransactions: number;
  totalGemsPurchased: number;
  totalCoinsPurchased: number;
  totalGemsSpent: number;
  totalCoinsSpent: number;
  transactionsByType: Record<string, number>;
  transactionsByCurrency: Record<string, number>;
  recentTransactions: PurchaseTransaction[];
  dailyStats: {
    date: string;
    count: number;
    gems: number;
    coins: number;
  }[];
  // Real money analytics
  totalUSDRevenue: number;
  uniqueBuyers: number;
  avgTransactionValue: number;
}

export function usePurchaseAnalytics(days: number = 30) {
  const queryClient = useQueryClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('purchase-transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'purchase_transactions',
        },
        () => {
          // Refetch data when new transaction is inserted
          queryClient.invalidateQueries({ queryKey: ["purchase-analytics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const queryStartDate = new Date();
  queryStartDate.setDate(queryStartDate.getDate() - days);

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ["purchase-analytics", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_transactions")
        .select(`
          *,
          profile:profiles!purchase_transactions_user_id_fkey(nickname, avatar_url)
        `)
        .gte("created_at", queryStartDate.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as PurchaseTransaction[];
    },
  });

  // Calculate stats from real transaction data
  const stats: PurchaseStats = {
    totalTransactions: transactions.length,
    totalGemsPurchased: 0,
    totalCoinsPurchased: 0,
    totalGemsSpent: 0,
    totalCoinsSpent: 0,
    totalUSDRevenue: 0,
    uniqueBuyers: 0,
    avgTransactionValue: 0,
    transactionsByType: {},
    transactionsByCurrency: {},
    recentTransactions: transactions.slice(0, 20),
    dailyStats: [],
  };

  // Track unique buyers
  const uniqueBuyerIds = new Set<string>();

  // Calculate aggregations
  const dailyMap: Record<string, { count: number; gems: number; coins: number }> = {};

  transactions.forEach((tx) => {
    // Track unique buyers
    if (tx.user_id) {
      uniqueBuyerIds.add(tx.user_id);
    }

    // By type
    stats.transactionsByType[tx.product_type] = 
      (stats.transactionsByType[tx.product_type] || 0) + 1;

    // By currency
    stats.transactionsByCurrency[tx.currency_used] = 
      (stats.transactionsByCurrency[tx.currency_used] || 0) + 1;

    // Currency totals
    if (tx.currency_used === "gems") {
      stats.totalGemsSpent += tx.amount_paid;
    } else if (tx.currency_used === "coins") {
      stats.totalCoinsSpent += tx.amount_paid;
    } else if (tx.currency_used === "usd") {
      stats.totalUSDRevenue += tx.amount_paid;
    }

    // Value received
    const value = tx.value_received as Record<string, number> | null;
    if (value) {
      if (value.gems) stats.totalGemsPurchased += value.gems;
      if (value.coins) stats.totalCoinsPurchased += value.coins;
    }

    // Daily aggregation
    if (tx.created_at) {
      const date = new Date(tx.created_at).toISOString().split("T")[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { count: 0, gems: 0, coins: 0 };
      }
      dailyMap[date].count++;
      if (tx.currency_used === "gems") dailyMap[date].gems += tx.amount_paid;
      if (tx.currency_used === "coins") dailyMap[date].coins += tx.amount_paid;
    }
  });

  stats.uniqueBuyers = uniqueBuyerIds.size;
  stats.avgTransactionValue = transactions.length > 0 
    ? stats.totalUSDRevenue / transactions.filter(t => t.currency_used === "usd").length || 0
    : 0;

  // Convert daily map to array
  stats.dailyStats = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    transactions,
    stats,
    isLoading,
    error,
    refetch,
  };
}

export function useVIPAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["vip-analytics"],
    queryFn: async () => {
      // Get all VIP subscriptions from the database
      const { data: subscriptions, error } = await supabase
        .from("vip_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      const now = new Date();
      const activeSubscriptions = subscriptions?.filter(
        (s) => new Date(s.expires_at) > now
      ) || [];

      const expiredSubscriptions = subscriptions?.filter(
        (s) => new Date(s.expires_at) <= now
      ) || [];

      // Calculate stats from actual data
      const totalActive = activeSubscriptions.length;
      const totalExpired = expiredSubscriptions.length;
      
      // Tier distribution
      const tierDistribution: Record<string, number> = {};
      activeSubscriptions.forEach((s) => {
        const tier = s.vip_tier || 'standard';
        tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
      });

      // Days until expiration distribution
      const daysDistribution: Record<string, number> = {};
      activeSubscriptions.forEach((s) => {
        const daysLeft = Math.ceil(
          (new Date(s.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const bucket = daysLeft <= 7 ? "1-7 days" : daysLeft <= 30 ? "8-30 days" : "30+ days";
        daysDistribution[bucket] = (daysDistribution[bucket] || 0) + 1;
      });

      // Platform distribution
      const platformDistribution: Record<string, number> = {};
      subscriptions?.forEach((s) => {
        const platform = s.purchase_platform || 'unknown';
        platformDistribution[platform] = (platformDistribution[platform] || 0) + 1;
      });

      return {
        totalActive,
        totalExpired,
        churnRate: (totalActive + totalExpired) > 0 
          ? (totalExpired / (totalActive + totalExpired)) * 100 
          : 0,
        tierDistribution,
        daysDistribution,
        platformDistribution,
        recentSubscriptions: subscriptions?.slice(0, 10) || [],
      };
    },
  });

  return {
    data,
    isLoading,
    error,
  };
}

export function useEconomyHealth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["economy-health"],
    queryFn: async () => {
      // gems is no longer selectable by any client role - read the totals
      // through the has_role-gated economy function instead.
      const { data: economy, error: profilesError } = await callRpc<Array<{
        coins: number | null; gems: number | null;
        total_points: number | null; games_played: number | null;
      }>>("admin_user_economy");

      if (profilesError) throw profilesError;

      const profiles = economy ?? [];

      const totalCoins = profiles?.reduce((sum, p) => sum + (p.coins || 0), 0) || 0;
      const totalGems = profiles?.reduce((sum, p) => sum + (p.gems || 0), 0) || 0;
      const totalXP = profiles?.reduce((sum, p) => sum + (p.total_points || 0), 0) || 0;
      const totalGamesPlayed = profiles?.reduce((sum, p) => sum + (p.games_played || 0), 0) || 0;
      const totalUsers = profiles?.length || 0;

      // Get average balances
      const avgCoins = totalUsers > 0 ? Math.round(totalCoins / totalUsers) : 0;
      const avgGems = totalUsers > 0 ? Math.round(totalGems / totalUsers) : 0;
      const avgXP = totalUsers > 0 ? Math.round(totalXP / totalUsers) : 0;

      // Wealth distribution (coins)
      const coinBuckets: Record<string, number> = {
        "0-1,000": 0,
        "1,000-5,000": 0,
        "5,000-10,000": 0,
        "10,000-50,000": 0,
        "50,000+": 0,
      };

      // Gem distribution
      const gemBuckets: Record<string, number> = {
        "0-10": 0,
        "10-50": 0,
        "50-100": 0,
        "100-500": 0,
        "500+": 0,
      };

      profiles?.forEach((p) => {
        const coins = p.coins || 0;
        if (coins < 1000) coinBuckets["0-1,000"]++;
        else if (coins < 5000) coinBuckets["1,000-5,000"]++;
        else if (coins < 10000) coinBuckets["5,000-10,000"]++;
        else if (coins < 50000) coinBuckets["10,000-50,000"]++;
        else coinBuckets["50,000+"]++;

        const gems = p.gems || 0;
        if (gems < 10) gemBuckets["0-10"]++;
        else if (gems < 50) gemBuckets["10-50"]++;
        else if (gems < 100) gemBuckets["50-100"]++;
        else if (gems < 500) gemBuckets["100-500"]++;
        else gemBuckets["500+"]++;
      });

      // Get recent game activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentGames, error: gamesError } = await supabase
        .from("game_plays")
        .select("id, stars_earned, score")
        .gte("played_at", sevenDaysAgo.toISOString());

      if (gamesError) console.error("Games error:", gamesError);

      const recentGamesCount = recentGames?.length || 0;
      const coinsEarnedRecently = recentGames?.reduce((sum, g) => sum + ((g.score || 0) > 0 ? 1000 : 500), 0) || 0;

      return {
        totalCoins,
        totalGems,
        totalXP,
        totalUsers,
        avgCoins,
        avgGems,
        avgXP,
        totalGamesPlayed,
        recentGamesCount,
        coinsEarnedRecently,
        coinBuckets,
        gemBuckets,
      };
    },
  });

  return {
    data,
    isLoading,
    error,
  };
}

// Get total real-money revenue from IAP
export function useIAPRevenue() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["iap-revenue"],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from("purchase_transactions")
        .select("*")
        .eq("currency_used", "usd");
      
      if (error) throw error;

      const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount_paid || 0), 0) || 0;
      const totalTransactions = transactions?.length || 0;

      // By product type
      const revenueByType: Record<string, number> = {};
      transactions?.forEach((t) => {
        revenueByType[t.product_type] = (revenueByType[t.product_type] || 0) + t.amount_paid;
      });

      // By platform
      const revenueByPlatform: Record<string, number> = {};
      transactions?.forEach((t) => {
        const platform = t.platform || 'unknown';
        revenueByPlatform[platform] = (revenueByPlatform[platform] || 0) + t.amount_paid;
      });

      return {
        totalRevenue,
        totalTransactions,
        avgTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        revenueByType,
        revenueByPlatform,
      };
    },
  });

  return {
    data,
    isLoading,
    error,
  };
}
