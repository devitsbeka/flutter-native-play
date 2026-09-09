import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REWARDS } from "@/config/rewardConfig";

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
  adWatchPlays: number;
  
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
  
  // Play Regeneration
  playRegenHours: number;
  playRegenMax: number;
  playsPerAd: number;
  maxAdsPerDay: number;
  gemsForPlays: number;
  gemsPlaysAmount: number;
}

/**
 * Default values, used when the database is unreachable.
 *
 * Taken from REWARDS rather than typed out again. They were typed out again
 * once and drifted: a win paying 1000 against a 500 stake, a gem worth 50
 * coins instead of 500, and a starting balance three settings disagreed
 * about — numbers that would have been served to the admin economy screen
 * as the truth on any request that failed (owner: "check and fix
 * economy_config values").
 */
const DEFAULT_CONFIG: EconomyConfig = {
  gameStake: REWARDS.GAME_STAKE,
  gameWinReward: REWARDS.GAME_WIN_REWARD,
  gameDrawRefund: REWARDS.GAME_DRAW_REFUND,
  levelUpCoinsPerLevel: REWARDS.LEVEL_UP_COINS,
  dailyRewards: REWARDS.DAILY_REWARDS.map((d) => d.coins),
  chestCoinsMin: REWARDS.CHEST_COINS_MIN,
  chestCoinsMax: REWARDS.CHEST_COINS_MAX,
  chestCooldownHours: REWARDS.CHEST_COOLDOWN_HOURS,
  spinRewards: REWARDS.SPIN_REWARDS.filter((r) => r.type === "coins").map((r) => r.value),
  adWatchPlays: REWARDS.AD_WATCH_PLAYS,
  gemToCoinsRate: REWARDS.GEM_TO_COINS_RATE,
  newPlayerCoins: REWARDS.NEW_PLAYER_COINS,
  newPlayerGems: REWARDS.NEW_PLAYER_GEMS,
  powerupPrices: {
    "5050": REWARDS.POWER_UP_PRICES["5050"],
    freeze: REWARDS.POWER_UP_PRICES.freeze,
    replace: REWARDS.POWER_UP_PRICES.replace,
  },
  vipPrices: {
    day: 5,
    week: 20,
    month: 50,
  },
  feedTriviaXpPerCorrect: 5,
  // Play Regeneration
  playRegenHours: REWARDS.PLAY_REGEN_HOURS,
  playRegenMax: REWARDS.PLAY_REGEN_MAX,
  playsPerAd: REWARDS.PLAYS_PER_AD,
  maxAdsPerDay: REWARDS.MAX_ADS_PER_DAY,
  gemsForPlays: REWARDS.GEMS_FOR_PLAYS,
  gemsPlaysAmount: REWARDS.GEMS_PLAYS_AMOUNT,
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
    // Per-day fallbacks off the same defaults as everything else: they were
    // a second, older copy of the ladder, so a database missing one row
    // answered with a number from a different economy.
    dailyRewards: DEFAULT_CONFIG.dailyRewards.map((coins, i) =>
      getVal(`daily_reward_day_${i + 1}`, coins),
    ),
    chestCoinsMin: getVal("chest_coins_min", DEFAULT_CONFIG.chestCoinsMin),
    chestCoinsMax: getVal("chest_coins_max", DEFAULT_CONFIG.chestCoinsMax),
    chestCooldownHours: getVal("chest_cooldown_hours", DEFAULT_CONFIG.chestCooldownHours),
    spinRewards: DEFAULT_CONFIG.spinRewards.map((coins, i) => getVal(`spin_reward_${i + 1}`, coins)),
    adWatchPlays: getVal("plays_per_ad", DEFAULT_CONFIG.adWatchPlays),
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
    // Play Regeneration
    playRegenHours: getVal("play_regen_hours", DEFAULT_CONFIG.playRegenHours),
    playRegenMax: getVal("play_regen_max", DEFAULT_CONFIG.playRegenMax),
    playsPerAd: getVal("plays_per_ad", DEFAULT_CONFIG.playsPerAd),
    maxAdsPerDay: getVal("max_ads_per_day", DEFAULT_CONFIG.maxAdsPerDay),
    gemsForPlays: getVal("gems_for_plays", DEFAULT_CONFIG.gemsForPlays),
    gemsPlaysAmount: getVal("gems_plays_amount", DEFAULT_CONFIG.gemsPlaysAmount),
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
