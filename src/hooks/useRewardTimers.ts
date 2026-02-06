import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface RewardData {
  dailyClaimedAt: string | null;
  chestClaimedAt: string | null;
}

// Chest cooldown in hours
const CHEST_COOLDOWN_HOURS = 24;

const QUERY_KEY = "reward-timers";

async function fetchRewardData(userId: string): Promise<RewardData> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("user_daily_rewards")
    .select("daily_claimed_at, chest_claimed_at")
    .eq("user_id", userId)
    .eq("reward_date", today)
    .maybeSingle();

  if (error) throw error;

  return {
    dailyClaimedAt: data?.daily_claimed_at ?? null,
    chestClaimedAt: data?.chest_claimed_at ?? null,
  };
}

function formatTimeDiff(diffMs: number): { timeLeft: string; secondsLeft: number } {
  if (diffMs <= 0) return { timeLeft: "00:00:00", secondsLeft: 0 };
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  return {
    timeLeft: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
    secondsLeft: Math.floor(diffMs / 1000),
  };
}

export function useRewardTimers(): RewardTimers {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());

  // Shared React Query — all callers share a single fetch
  const { data, isLoading } = useQuery<RewardData>({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: () => fetchRewardData(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 10 * 60 * 1000,
  });

  // Tick every second for countdown display
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const dailyReset = useMemo(() => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return formatTimeDiff(midnight.getTime() - now.getTime());
  }, [now]);

  const chestCooldown = useMemo(() => {
    if (!data?.chestClaimedAt) {
      return { timeLeft: "00:00:00", secondsLeft: 0, canClaim: true };
    }
    const cooldownEnd = new Date(data.chestClaimedAt).getTime() + CHEST_COOLDOWN_HOURS * 60 * 60 * 1000;
    const diff = cooldownEnd - now.getTime();
    if (diff <= 0) return { timeLeft: "00:00:00", secondsLeft: 0, canClaim: true };
    return { ...formatTimeDiff(diff), canClaim: false };
  }, [now, data?.chestClaimedAt]);

  const canClaimDaily = !data?.dailyClaimedAt;

  const refreshTimers = async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
  };

  return {
    loading: isLoading,
    canClaimDaily,
    dailyTimeLeft: dailyReset.timeLeft,
    dailySecondsLeft: dailyReset.secondsLeft,
    canClaimChest: chestCooldown.canClaim,
    chestTimeLeft: chestCooldown.timeLeft,
    chestSecondsLeft: chestCooldown.secondsLeft,
    refreshTimers,
  };
}

// Hook to claim daily reward — invalidates the shared cache after claiming
export function useDailyRewardsClaim() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const claimDailyReward = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split("T")[0];
      const nowIso = new Date().toISOString();

      const { data: existing } = await supabase
        .from("user_daily_rewards")
        .select("*")
        .eq("user_id", user.id)
        .eq("reward_date", today)
        .maybeSingle();

      if (existing) {
        if (existing.daily_claimed) return false;
        await supabase
          .from("user_daily_rewards")
          .update({
            daily_claimed: true,
            daily_claimed_at: nowIso,
            streak_count: (existing.streak_count || 0) + 1,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_daily_rewards").insert({
          user_id: user.id,
          reward_date: today,
          daily_claimed: true,
          daily_claimed_at: nowIso,
          streak_count: 1,
        });
      }

      // Optimistic update + background revalidation
      queryClient.setQueryData<RewardData>([QUERY_KEY, user.id], (old) => ({
        dailyClaimedAt: nowIso,
        chestClaimedAt: old?.chestClaimedAt ?? null,
      }));

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
      const nowIso = new Date().toISOString();

      const { data: existing } = await supabase
        .from("user_daily_rewards")
        .select("*")
        .eq("user_id", user.id)
        .eq("reward_date", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_daily_rewards")
          .update({
            chest_claimed: true,
            chest_claimed_at: nowIso,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_daily_rewards").insert({
          user_id: user.id,
          reward_date: today,
          chest_claimed: true,
          chest_claimed_at: nowIso,
        });
      }

      // Optimistic update
      queryClient.setQueryData<RewardData>([QUERY_KEY, user.id], (old) => ({
        dailyClaimedAt: old?.dailyClaimedAt ?? null,
        chestClaimedAt: nowIso,
      }));

      return true;
    } catch (error) {
      console.error("Error claiming chest reward:", error);
      return false;
    }
  };

  return { claimDailyReward, claimChestReward };
}
