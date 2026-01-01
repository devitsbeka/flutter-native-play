import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCurrency } from "./useCurrency";

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

export function useRewards() {
  const { user, profile, updateProfile } = useAuth();
  const { addCoins, addGems, addCurrency } = useCurrency();
  const [dailySpinInfo, setDailySpinInfo] = useState<DailySpinInfo>({
    canSpin: true,
    spinsUsed: 0,
    maxSpins: 1,
  });
  const [loading, setLoading] = useState(true);

  const fetchDailySpinInfo = useCallback(async () => {
    if (!user) {
      setDailySpinInfo({ canSpin: true, spinsUsed: 0, maxSpins: 1 });
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("user_daily_spins")
        .select("*")
        .eq("user_id", user.id)
        .eq("spin_date", today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDailySpinInfo({
          canSpin: data.spins_used < data.max_spins,
          spinsUsed: data.spins_used,
          maxSpins: data.max_spins,
        });
      } else {
        setDailySpinInfo({ canSpin: true, spinsUsed: 0, maxSpins: 1 });
      }
    } catch (error) {
      console.error("Error fetching daily spin info:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDailySpinInfo();
  }, [fetchDailySpinInfo]);

  const recordSpinReward = async (result: SpinResult): Promise<boolean> => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split("T")[0];

      // Record the reward
      await supabase.from("user_rewards").insert([{
        user_id: user.id,
        reward_type: "spin",
        reward_value: { label: result.label, value: result.value, type: result.type },
      }]);

      // Update or create daily spin record
      const { data: existing } = await supabase
        .from("user_daily_spins")
        .select("*")
        .eq("user_id", user.id)
        .eq("spin_date", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_daily_spins")
          .update({ spins_used: existing.spins_used + 1 })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_daily_spins").insert({
          user_id: user.id,
          spin_date: today,
          spins_used: 1,
          max_spins: 1,
        });
      }

      // Apply rewards based on type
      if (result.type === "xp" || result.type === "bonus") {
        const currentPoints = profile?.total_points || 0;
        await updateProfile({ total_points: currentPoints + result.value });
      } else if (result.type === "coins") {
        await addCoins(result.value);
      } else if (result.type === "gems") {
        await addGems(result.value);
      }

      // Refresh spin info
      await fetchDailySpinInfo();

      return true;
    } catch (error) {
      console.error("Error recording spin reward:", error);
      return false;
    }
  };

  const recordChestReward = async (rewards: { type: string; value: number; label: string }[]): Promise<{ success: boolean; newPoints?: number; newCoins?: number; newGems?: number }> => {
    if (!user) return { success: false };

    try {
      // Record the chest reward
      await supabase.from("user_rewards").insert([{
        user_id: user.id,
        reward_type: "chest",
        reward_value: { rewards: rewards.map(r => ({ type: r.type, value: r.value, label: r.label })) },
      }]);

      // Process all reward types
      let newPoints: number | undefined;
      let totalCoins = 0;
      let totalGems = 0;
      
      for (const reward of rewards) {
        if (reward.type === "xp") {
          const currentPoints = profile?.total_points || 0;
          newPoints = currentPoints + reward.value;
          await updateProfile({ total_points: newPoints });
        } else if (reward.type === "coins") {
          totalCoins += reward.value;
        } else if (reward.type === "gems") {
          totalGems += reward.value;
        }
      }

      // Add coins and gems
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

  return {
    dailySpinInfo,
    loading,
    recordSpinReward,
    recordChestReward,
    refreshSpinInfo: fetchDailySpinInfo,
  };
}
