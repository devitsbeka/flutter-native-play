import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { toast } from "sonner";
import { VIP_DAILY_POWERUPS } from "@/utils/vipMultipliers";
import { PowerUpType } from "@/hooks/useUserPowerUps";

interface DailyVipRewardsState {
  powersClaimed: boolean;
  spinsGranted: boolean;
  loading: boolean;
}

// Map VIP power-up keys to database power-up types
const POWERUP_TYPE_MAP: Record<keyof typeof VIP_DAILY_POWERUPS, PowerUpType> = {
  FREEZE: "freeze",
  FIFTY_FIFTY: "5050",
  REPLACE: "replace",
  TIME_DRAIN: "time-drain",
};

export function useDailyVipRewards() {
  const { user } = useAuth();
  const { isVip } = useVipStatus();
  const [state, setState] = useState<DailyVipRewardsState>({
    powersClaimed: false,
    spinsGranted: false,
    loading: true,
  });

  // Fetch today's VIP rewards status
  const fetchDailyStatus = useCallback(async () => {
    if (!user || !isVip) {
      setState({ powersClaimed: false, spinsGranted: false, loading: false });
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("user_daily_vip_rewards")
        .select("*")
        .eq("user_id", user.id)
        .eq("reward_date", today)
        .maybeSingle();

      if (error) throw error;

      setState({
        powersClaimed: data?.powers_claimed ?? false,
        spinsGranted: data?.spins_granted ?? false,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching daily VIP rewards:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user, isVip]);

  useEffect(() => {
    fetchDailyStatus();
  }, [fetchDailyStatus]);

  // Claim daily power-ups
  const claimDailyPowerUps = useCallback(async (): Promise<boolean> => {
    if (!user || !isVip || state.powersClaimed) return false;

    try {
      const today = new Date().toISOString().split("T")[0];

      // Grant power-ups using the user_power_ups table
      const powerUpEntries = Object.entries(VIP_DAILY_POWERUPS) as [keyof typeof VIP_DAILY_POWERUPS, number][];
      
      for (const [key, amount] of powerUpEntries) {
        const powerUpType = POWERUP_TYPE_MAP[key];
        
        // Check if record exists
        const { data: existing } = await supabase
          .from("user_power_ups")
          .select("quantity")
          .eq("user_id", user.id)
          .eq("power_up_type", powerUpType)
          .maybeSingle();

        if (existing) {
          // Update existing
          await supabase
            .from("user_power_ups")
            .update({ quantity: (existing.quantity || 0) + amount })
            .eq("user_id", user.id)
            .eq("power_up_type", powerUpType);
        } else {
          // Insert new
          await supabase
            .from("user_power_ups")
            .insert({
              user_id: user.id,
              power_up_type: powerUpType,
              quantity: amount,
            });
        }
      }

      // Upsert daily record
      const { error } = await supabase
        .from("user_daily_vip_rewards")
        .upsert({
          user_id: user.id,
          reward_date: today,
          powers_claimed: true,
        }, {
          onConflict: "user_id,reward_date",
        });

      if (error) throw error;

      setState(prev => ({ ...prev, powersClaimed: true }));
      toast.success("VIP ძალები მიღებულია!");
      return true;
    } catch (error) {
      console.error("Error claiming daily power-ups:", error);
      toast.error("ძალების მიღება ვერ მოხერხდა");
      return false;
    }
  }, [user, isVip, state.powersClaimed]);

  // Mark spins as granted (called from useRewards)
  const markSpinsGranted = useCallback(async (): Promise<boolean> => {
    if (!user || !isVip) return false;

    try {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("user_daily_vip_rewards")
        .upsert({
          user_id: user.id,
          reward_date: today,
          spins_granted: true,
        }, {
          onConflict: "user_id,reward_date",
        });

      if (error) throw error;

      setState(prev => ({ ...prev, spinsGranted: true }));
      return true;
    } catch (error) {
      console.error("Error marking spins granted:", error);
      return false;
    }
  }, [user, isVip]);

  return {
    powersClaimed: state.powersClaimed,
    spinsGranted: state.spinsGranted,
    loading: state.loading,
    claimDailyPowerUps,
    markSpinsGranted,
    canClaimPowerUps: isVip && !state.powersClaimed,
    refresh: fetchDailyStatus,
  };
}
