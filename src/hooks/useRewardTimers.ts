import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface DailyRewardStatus {
  canClaimDaily: boolean;
  dailyTimeLeft: string;
  dailySecondsLeft: number;
}

interface ChestStatus {
  canClaimChest: boolean;
  chestTimeLeft: string;
  chestSecondsLeft: number;
}

interface RewardTimers extends DailyRewardStatus, ChestStatus {
  loading: boolean;
  refreshTimers: () => Promise<void>;
}

// Chest cooldown in hours
const CHEST_COOLDOWN_HOURS = 24;

export function useRewardTimers(): RewardTimers {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyClaimedAt, setDailyClaimedAt] = useState<Date | null>(null);
  const [chestClaimedAt, setChestClaimedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch reward status from database
  const fetchRewardStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("user_daily_rewards")
        .select("*")
        .eq("user_id", user.id)
        .eq("reward_date", today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDailyClaimedAt(data.daily_claimed_at ? new Date(data.daily_claimed_at) : null);
        setChestClaimedAt(data.chest_claimed_at ? new Date(data.chest_claimed_at) : null);
      } else {
        setDailyClaimedAt(null);
        setChestClaimedAt(null);
      }
    } catch (error) {
      console.error("Error fetching reward status:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRewardStatus();
  }, [fetchRewardStatus]);

  // Calculate time until midnight (next daily reset)
  const getMidnightReset = (): { timeLeft: string; secondsLeft: number } => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return {
      timeLeft: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      secondsLeft: Math.floor(diff / 1000),
    };
  };

  // Calculate chest cooldown
  const getChestCooldown = (): { timeLeft: string; secondsLeft: number; canClaim: boolean } => {
    if (!chestClaimedAt) {
      return { timeLeft: "00:00:00", secondsLeft: 0, canClaim: true };
    }

    const cooldownEnd = new Date(chestClaimedAt.getTime() + CHEST_COOLDOWN_HOURS * 60 * 60 * 1000);
    const diff = cooldownEnd.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { timeLeft: "00:00:00", secondsLeft: 0, canClaim: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return {
      timeLeft: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      secondsLeft: Math.floor(diff / 1000),
      canClaim: false,
    };
  };

  const dailyReset = getMidnightReset();
  const chestCooldown = getChestCooldown();

  // Can claim daily if not claimed today
  const canClaimDaily = !dailyClaimedAt;

  return {
    loading,
    canClaimDaily,
    dailyTimeLeft: dailyReset.timeLeft,
    dailySecondsLeft: dailyReset.secondsLeft,
    canClaimChest: chestCooldown.canClaim,
    chestTimeLeft: chestCooldown.timeLeft,
    chestSecondsLeft: chestCooldown.secondsLeft,
    refreshTimers: fetchRewardStatus,
  };
}

// Hook to claim daily reward
export function useDailyRewardsClaim() {
  const { user } = useAuth();

  const claimDailyReward = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      // Check if record exists for today
      const { data: existing } = await supabase
        .from("user_daily_rewards")
        .select("*")
        .eq("user_id", user.id)
        .eq("reward_date", today)
        .maybeSingle();

      if (existing) {
        if (existing.daily_claimed) {
          return false; // Already claimed
        }
        // Update existing record
        await supabase
          .from("user_daily_rewards")
          .update({ 
            daily_claimed: true, 
            daily_claimed_at: now,
            streak_count: (existing.streak_count || 0) + 1,
          })
          .eq("id", existing.id);
      } else {
        // Create new record
        await supabase
          .from("user_daily_rewards")
          .insert({
            user_id: user.id,
            reward_date: today,
            daily_claimed: true,
            daily_claimed_at: now,
            streak_count: 1,
          });
      }

      return true;
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      return false;
    }
  };

  const claimChestReward = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      // Check if record exists for today
      const { data: existing } = await supabase
        .from("user_daily_rewards")
        .select("*")
        .eq("user_id", user.id)
        .eq("reward_date", today)
        .maybeSingle();

      if (existing) {
        // Update existing record
        await supabase
          .from("user_daily_rewards")
          .update({ 
            chest_claimed: true, 
            chest_claimed_at: now,
          })
          .eq("id", existing.id);
      } else {
        // Create new record
        await supabase
          .from("user_daily_rewards")
          .insert({
            user_id: user.id,
            reward_date: today,
            chest_claimed: true,
            chest_claimed_at: now,
          });
      }

      return true;
    } catch (error) {
      console.error("Error claiming chest reward:", error);
      return false;
    }
  };

  return { claimDailyReward, claimChestReward };
}
