import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCurrency } from "./useCurrency";
import { useUserPowerUps, PowerUpType } from "./useUserPowerUps";
import { useVipStatus } from "./useVipStatus";
import { getMaxDailySpins, calculateXP } from "@/utils/vipMultipliers";

interface SpinResult {
  label: string;
  value: number;
  type: string;
}

interface DailySpinInfo {
  canSpin: boolean;
  spinsUsed: number;
  maxSpins: number;
}

const QUERY_KEY = "daily-spin-info";

async function fetchSpinInfo(userId: string, isVip: boolean): Promise<DailySpinInfo> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("user_daily_spins")
    .select("*")
    .eq("user_id", userId)
    .eq("spin_date", today)
    .maybeSingle();

  if (error) throw error;

  const vipMaxSpins = getMaxDailySpins(isVip);

  if (data) {
    const effectiveMaxSpins = Math.max(data.max_spins, vipMaxSpins);
    return {
      canSpin: data.spins_used < effectiveMaxSpins,
      spinsUsed: data.spins_used,
      maxSpins: effectiveMaxSpins,
    };
  }

  return { canSpin: true, spinsUsed: 0, maxSpins: vipMaxSpins };
}

const SPIN_POWER_UP_TYPES: PowerUpType[] = ["5050", "freeze", "replace", "time-drain"];

export function useRewards() {
  const { user, profile, updateProfile } = useAuth();
  const { addCoins, addGems, addCurrency } = useCurrency();
  const { addPowerUp } = useUserPowerUps();
  const { isVip } = useVipStatus();
  const queryClient = useQueryClient();

  const { data: dailySpinInfo = { canSpin: true, spinsUsed: 0, maxSpins: 1 }, isLoading: loading } = useQuery<DailySpinInfo>({
    queryKey: [QUERY_KEY, user?.id, isVip],
    queryFn: () => fetchSpinInfo(user!.id, isVip),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const invalidateSpinInfo = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id, isVip] });
  }, [queryClient, user?.id, isVip]);

  const recordSpinReward = async (result: SpinResult): Promise<boolean> => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split("T")[0];

      await supabase.from("user_rewards").insert([{
        user_id: user.id,
        reward_type: "spin",
        reward_value: { label: result.label, value: result.value, type: result.type },
      }]);

      // Increment spins_used guarded by the expected value so parallel spins
      // can't both write the same count; on a lost race, re-read and retry once.
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data: existing } = await supabase
          .from("user_daily_spins")
          .select("*")
          .eq("user_id", user.id)
          .eq("spin_date", today)
          .maybeSingle();

        if (existing) {
          const { data: updated } = await supabase
            .from("user_daily_spins")
            .update({ spins_used: existing.spins_used + 1 })
            .eq("id", existing.id)
            .eq("spins_used", existing.spins_used)
            .select();
          if (updated && updated.length > 0) break;
        } else {
          const { error: insertError } = await supabase.from("user_daily_spins").insert({
            user_id: user.id,
            spin_date: today,
            spins_used: 1,
            max_spins: 1,
          });
          if (!insertError) break;
          // Parallel spin inserted the row first — retry via the update path
        }
      }

      if (result.type === "xp" || result.type === "bonus") {
        const currentPoints = profile?.total_points || 0;
        const xpToAdd = calculateXP(result.value, isVip);
        await updateProfile({ total_points: currentPoints + xpToAdd });
      } else if (result.type === "coins") {
        await addCoins(result.value);
      } else if (result.type === "gems") {
        await addGems(result.value);
      } else if (result.type === "powerup") {
        // Grant a random power-up (SPIN_REWARDS "powerup" segments were never granted)
        const type = SPIN_POWER_UP_TYPES[Math.floor(Math.random() * SPIN_POWER_UP_TYPES.length)];
        await addPowerUp(type, Math.max(1, result.value));
      }

      await invalidateSpinInfo();
      return true;
    } catch (error) {
      console.error("Error recording spin reward:", error);
      return false;
    }
  };

  const recordChestReward = async (rewards: { type: string; value: number; label: string }[]): Promise<{ success: boolean; newPoints?: number; newCoins?: number; newGems?: number }> => {
    if (!user) return { success: false };

    try {
      await supabase.from("user_rewards").insert([{
        user_id: user.id,
        reward_type: "chest",
        reward_value: { rewards: rewards.map(r => ({ type: r.type, value: r.value, label: r.label })) },
      }]);

      let newPoints: number | undefined;
      let totalCoins = 0;
      let totalGems = 0;

      for (const reward of rewards) {
        if (reward.type === "xp") {
          const currentPoints = profile?.total_points || 0;
          const xpToAdd = calculateXP(reward.value, isVip);
          newPoints = currentPoints + xpToAdd;
          await updateProfile({ total_points: newPoints });
        } else if (reward.type === "coins") {
          totalCoins += reward.value;
        } else if (reward.type === "gems") {
          totalGems += reward.value;
        }
      }

      if (totalCoins > 0 || totalGems > 0) {
        await addCurrency(totalCoins, totalGems);
      }

      return {
        success: true,
        newPoints,
        newCoins: totalCoins > 0 ? (profile?.coins || 0) + totalCoins : undefined,
        newGems: totalGems > 0 ? (profile?.gems || 0) + totalGems : undefined,
      };
    } catch (error) {
      console.error("Error recording chest reward:", error);
      return { success: false };
    }
  };

  const addExtraSpins = async (extraSpins: number = 5): Promise<boolean> => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("user_daily_spins")
        .select("*")
        .eq("user_id", user.id)
        .eq("spin_date", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_daily_spins")
          .update({ max_spins: existing.max_spins + extraSpins })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_daily_spins").insert({
          user_id: user.id,
          spin_date: today,
          spins_used: 0,
          max_spins: 1 + extraSpins,
        });
      }

      await invalidateSpinInfo();
      return true;
    } catch (error) {
      console.error("Error adding extra spins:", error);
      return false;
    }
  };

  return {
    dailySpinInfo,
    loading,
    recordSpinReward,
    recordChestReward,
    refreshSpinInfo: invalidateSpinInfo,
    addExtraSpins,
  };
}
