import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
        reward_value: result as unknown as Record<string, unknown>,
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

      // Apply XP reward if applicable
      if (result.type === "xp" || result.type === "bonus") {
        const currentPoints = profile?.total_points || 0;
        await updateProfile({ total_points: currentPoints + result.value });
      }

      // Refresh spin info
      await fetchDailySpinInfo();

      return true;
    } catch (error) {
      console.error("Error recording spin reward:", error);
      return false;
    }
  };

  const recordChestReward = async (rewards: { type: string; value: number; label: string }[]): Promise<boolean> => {
    if (!user) return false;

    try {
      // Record the chest reward
      await supabase.from("user_rewards").insert([{
        user_id: user.id,
        reward_type: "chest",
        reward_value: { rewards } as unknown as Record<string, unknown>,
      }]);

      // Calculate total XP from rewards
      const xpReward = rewards.find(r => r.type === "xp");
      if (xpReward) {
        const currentPoints = profile?.total_points || 0;
        await updateProfile({ total_points: currentPoints + xpReward.value });
      }

      return true;
    } catch (error) {
      console.error("Error recording chest reward:", error);
      return false;
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
