import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EconomyConfigItem {
  id: string;
  value: number;
  category: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface EconomyConfig {
  // Game Stakes
  gameStake: number;
  gameWinReward: number;
  gameDrawRefund: number;
  
  // Level Up
  levelUpCoinsPerLevel: number;
  
  // Daily Rewards
  dailyRewards: number[];
  
  // Chests
  chestCoinsMin: number;
  chestCoinsMax: number;
  chestCooldownHours: number;
  
  // Spin Wheel
  spinRewards: number[];
  
  // Ads
  adWatchCoins: number;
  
  // Ratios
  gemToCoinsRate: number;
  
  // New Player
  newPlayerCoins: number;
  newPlayerGems: number;
  
  // Power-up Prices
  powerupPrices: {
    "5050": number;
    freeze: number;
    replace: number;
  };
  
  // VIP Prices
  vipPrices: {
    day: number;
    week: number;
    month: number;
  };
  
  // XP
  feedTriviaXpPerCorrect: number;
}

// Default values (fallback if database is unavailable)
const DEFAULT_CONFIG: EconomyConfig = {
  gameStake: 500,
  gameWinReward: 1000,
  gameDrawRefund: 500,
  levelUpCoinsPerLevel: 50,
  dailyRewards: [100, 150, 200, 250, 350, 500, 1000],
  chestCoinsMin: 50,
  chestCoinsMax: 200,
  chestCooldownHours: 4,
  spinRewards: [50, 100, 200, 500, 1000],
  adWatchCoins: 50,
  gemToCoinsRate: 50,
  newPlayerCoins: 1000,
  newPlayerGems: 10,
  powerupPrices: {
    "5050": 100,
    freeze: 150,
    replace: 200,
  },
  vipPrices: {
    day: 10,
    week: 50,
    month: 150,
  },
  feedTriviaXpPerCorrect: 5,
};

function parseConfigItems(items: EconomyConfigItem[]): EconomyConfig {
  const getVal = (id: string, fallback: number) => {
    const item = items.find(i => i.id === id);
    return item ? Number(item.value) : fallback;
  };

  return {
    gameStake: getVal("game_stake", DEFAULT_CONFIG.gameStake),
    gameWinReward: getVal("game_win_reward", DEFAULT_CONFIG.gameWinReward),
    gameDrawRefund: getVal("game_draw_refund", DEFAULT_CONFIG.gameDrawRefund),
    levelUpCoinsPerLevel: getVal("level_up_coins_per_level", DEFAULT_CONFIG.levelUpCoinsPerLevel),
    dailyRewards: [
      getVal("daily_reward_day_1", 100),
      getVal("daily_reward_day_2", 150),
      getVal("daily_reward_day_3", 200),
      getVal("daily_reward_day_4", 250),
      getVal("daily_reward_day_5", 350),
      getVal("daily_reward_day_6", 500),
      getVal("daily_reward_day_7", 1000),
    ],
    chestCoinsMin: getVal("chest_coins_min", DEFAULT_CONFIG.chestCoinsMin),
    chestCoinsMax: getVal("chest_coins_max", DEFAULT_CONFIG.chestCoinsMax),
    chestCooldownHours: getVal("chest_cooldown_hours", DEFAULT_CONFIG.chestCooldownHours),
    spinRewards: [
      getVal("spin_reward_1", 50),
      getVal("spin_reward_2", 100),
      getVal("spin_reward_3", 200),
      getVal("spin_reward_4", 500),
      getVal("spin_reward_5", 1000),
    ],
    adWatchCoins: getVal("ad_watch_coins", DEFAULT_CONFIG.adWatchCoins),
    gemToCoinsRate: getVal("gem_to_coins_rate", DEFAULT_CONFIG.gemToCoinsRate),
    newPlayerCoins: getVal("new_player_coins", DEFAULT_CONFIG.newPlayerCoins),
    newPlayerGems: getVal("new_player_gems", DEFAULT_CONFIG.newPlayerGems),
    powerupPrices: {
      "5050": getVal("powerup_price_5050", DEFAULT_CONFIG.powerupPrices["5050"]),
      freeze: getVal("powerup_price_freeze", DEFAULT_CONFIG.powerupPrices.freeze),
      replace: getVal("powerup_price_replace", DEFAULT_CONFIG.powerupPrices.replace),
    },
    vipPrices: {
      day: getVal("vip_price_day", DEFAULT_CONFIG.vipPrices.day),
      week: getVal("vip_price_week", DEFAULT_CONFIG.vipPrices.week),
      month: getVal("vip_price_month", DEFAULT_CONFIG.vipPrices.month),
    },
    feedTriviaXpPerCorrect: getVal("feed_trivia_xp_per_correct", DEFAULT_CONFIG.feedTriviaXpPerCorrect),
  };
}

export function useEconomyConfig() {
  const queryClient = useQueryClient();

  const { data: rawItems = [], isLoading, error } = useQuery({
    queryKey: ["economy-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economy_config")
        .select("*")
        .order("id");
      
      if (error) throw error;
      return data as EconomyConfigItem[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const config = rawItems.length > 0 ? parseConfigItems(rawItems) : DEFAULT_CONFIG;

  const updateConfig = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from("economy_config")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["economy-config"] });
    },
  });

  return {
    config,
    rawItems,
    isLoading,
    error,
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  };
}

// Hook for admin to get all raw config items grouped by category
export function useEconomyConfigAdmin() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["economy-config-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economy_config")
        .select("*")
        .order("category")
        .order("id");
      
      if (error) throw error;
      return data as EconomyConfigItem[];
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from("economy_config")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["economy-config"] });
      queryClient.invalidateQueries({ queryKey: ["economy-config-admin"] });
    },
  });

  // Group by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, EconomyConfigItem[]>);

  return {
    items,
    groupedItems,
    isLoading,
    error,
    refetch,
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  };
}
