import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { chestCooldownStatus, dailyResetCountdown } from "@/utils/rewardTimers";

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

  // Consumers that only read the canClaim booleans (e.g. Index) don't need a 1Hz
  // tick — access to the countdown fields is detected via getters on the returned
  // object, and only those instances upgrade to a 1s cadence.
  const needsCountdownRef = useRef(false);
  const [tickMs, setTickMs] = useState(30_000);

  useEffect(() => {
    if (needsCountdownRef.current && tickMs !== 1000) setTickMs(1000);
  });

  // Tick for countdown display — paused while the tab is hidden
  useEffect(() => {
    let interval: number | undefined;

    const start = () => {
      if (interval === undefined) {
        interval = window.setInterval(() => setNow(new Date()), tickMs);
      }
    };
    const stop = () => {
      if (interval !== undefined) {
        clearInterval(interval);
        interval = undefined;
      }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setNow(new Date()); // catch up immediately on return
        start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    if (!document.hidden) start();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
    };
  }, [tickMs]);

  const dailyReset = useMemo(() => dailyResetCountdown(now), [now]);

  const chestCooldown = useMemo(
    () => chestCooldownStatus(data?.chestClaimedAt, now),
    [now, data?.chestClaimedAt]
  );

  const canClaimDaily = !data?.dailyClaimedAt;

  const refreshTimers = async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
  };

  // Getters mark this instance as needing per-second updates (ref write is
  // idempotent and safe during render); the effect above picks it up.
  return {
    loading: isLoading,
    canClaimDaily,
    get dailyTimeLeft() {
      needsCountdownRef.current = true;
      return dailyReset.timeLeft;
    },
    get dailySecondsLeft() {
      needsCountdownRef.current = true;
      return dailyReset.secondsLeft;
    },
    canClaimChest: chestCooldown.canClaim,
    get chestTimeLeft() {
      needsCountdownRef.current = true;
      return chestCooldown.timeLeft;
    },
    get chestSecondsLeft() {
      needsCountdownRef.current = true;
      return chestCooldown.secondsLeft;
    },
    refreshTimers,
  };
}

/** What the server actually awarded for today's claim. */
export interface DailyRewardClaim {
  coins: number;
  gems: number;
  streak: number;
  newCoins: number;
  newGems: number;
}

// Hook to claim daily reward — invalidates the shared cache after claiming
export function useDailyRewardsClaim() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Claim today's daily reward.
   *
   * The whole decision — which day of the streak, what it pays, whether PRO
   * Plus applies, whether today was already claimed — belongs to
   * `claim_daily_reward` now. This used to mark the row claimed here and then
   * separately credit an amount the client had worked out for itself, which
   * meant the payout was whatever the caller said it was.
   *
   * Returns what was actually awarded, so the celebration shows the granted
   * figures rather than a local guess at them.
   */
  const claimDailyReward = async (): Promise<DailyRewardClaim | null> => {
    if (!user) return null;

    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase.rpc("claim_daily_reward");

      if (error) throw error;

      const claim = Array.isArray(data) ? data[0] : data;
      if (!claim) return null;

      // Optimistic update + background revalidation
      queryClient.setQueryData<RewardData>([QUERY_KEY, user.id], (old) => ({
        dailyClaimedAt: nowIso,
        chestClaimedAt: old?.chestClaimedAt ?? null,
      }));

      return {
        coins: claim.coins_awarded,
        gems: claim.gems_awarded,
        streak: claim.streak,
        newCoins: claim.new_coins,
        newGems: claim.new_gems,
      };
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      return null;
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
