import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PurchaseTransaction {
  id: string;
  user_id: string;
  product_id: string | null;
  product_type: string;
  currency_used: string;
  amount_paid: number;
  value_received: Record<string, unknown>;
  platform: string | null;
  created_at: string;
  profile?: {
    nickname: string;
    avatar_url: string | null;
  };
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
}

export function usePurchaseAnalytics(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ["purchase-analytics", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_transactions")
        .select(`
          *,
          profile:profiles!purchase_transactions_user_id_fkey(nickname, avatar_url)
        `)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PurchaseTransaction[];
    },
  });

  // Calculate stats
  const stats: PurchaseStats = {
    totalTransactions: transactions.length,
    totalGemsPurchased: 0,
    totalCoinsPurchased: 0,
    totalGemsSpent: 0,
    totalCoinsSpent: 0,
    transactionsByType: {},
    transactionsByCurrency: {},
    recentTransactions: transactions.slice(0, 20),
    dailyStats: [],
  };

  // Calculate aggregations
  const dailyMap: Record<string, { count: number; gems: number; coins: number }> = {};

  transactions.forEach((tx) => {
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
    }

    // Value received
    const value = tx.value_received as Record<string, number>;
    if (value.gems) stats.totalGemsPurchased += value.gems;
    if (value.coins) stats.totalCoinsPurchased += value.coins;

    // Daily aggregation
    const date = new Date(tx.created_at).toISOString().split("T")[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { count: 0, gems: 0, coins: 0 };
    }
    dailyMap[date].count++;
    if (tx.currency_used === "gems") dailyMap[date].gems += tx.amount_paid;
    if (tx.currency_used === "coins") dailyMap[date].coins += tx.amount_paid;
  });

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
      // Get all VIP subscriptions
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

      // Calculate stats
      const totalActive = activeSubscriptions.length;
      const totalExpired = expiredSubscriptions.length;
      
      // Days distribution
      const daysDistribution: Record<string, number> = {};
      activeSubscriptions.forEach((s) => {
        const daysLeft = Math.ceil(
          (new Date(s.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const bucket = daysLeft <= 7 ? "1-7 days" : daysLeft <= 30 ? "8-30 days" : "30+ days";
        daysDistribution[bucket] = (daysDistribution[bucket] || 0) + 1;
      });

      return {
        totalActive,
        totalExpired,
        churnRate: totalExpired > 0 ? (totalExpired / (totalActive + totalExpired)) * 100 : 0,
        daysDistribution,
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
      // Get total coins and gems in circulation
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("coins, gems");
      
      if (error) throw error;

      const totalCoins = profiles?.reduce((sum, p) => sum + (p.coins || 0), 0) || 0;
      const totalGems = profiles?.reduce((sum, p) => sum + (p.gems || 0), 0) || 0;
      const totalUsers = profiles?.length || 0;

      // Get average balances
      const avgCoins = totalUsers > 0 ? Math.round(totalCoins / totalUsers) : 0;
      const avgGems = totalUsers > 0 ? Math.round(totalGems / totalUsers) : 0;

      // Wealth distribution
      const wealthBuckets = {
        "0-1000 coins": 0,
        "1000-5000 coins": 0,
        "5000-10000 coins": 0,
        "10000+ coins": 0,
      };

      profiles?.forEach((p) => {
        const coins = p.coins || 0;
        if (coins < 1000) wealthBuckets["0-1000 coins"]++;
        else if (coins < 5000) wealthBuckets["1000-5000 coins"]++;
        else if (coins < 10000) wealthBuckets["5000-10000 coins"]++;
        else wealthBuckets["10000+ coins"]++;
      });

      return {
        totalCoins,
        totalGems,
        totalUsers,
        avgCoins,
        avgGems,
        wealthBuckets,
      };
    },
  });

  return {
    data,
    isLoading,
    error,
  };
}
