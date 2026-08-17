import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { toast } from "sonner";
import { t as tStandalone } from "@/contexts/LanguageContext";

interface DailyVipRewardsState {
  powersClaimed: boolean;
  spinsGranted: boolean;
  loading: boolean;
}

// Which power-ups a day is worth now lives in claim_daily_vip_powers().

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

  /**
   * Today's PRO power-ups, in one server call.
   *
   * This used to grant four power-ups in a loop without checking any of the
   * four writes, then mark the day claimed — and that last write was the only
   * one it did check. A grant that failed left the player told they had their
   * powers, without them, and unable to claim again. It also read a quantity
   * and wrote it back, so two tabs claiming at once lost an increment.
   *
   * claim_daily_vip_powers() checks the subscription, refuses a second claim
   * on the same day, and grants all four in one transaction — nothing is
   * marked claimed unless every power-up landed.
   */
  const claimDailyPowerUps = useCallback(async (): Promise<boolean> => {
    if (!user || !isVip || state.powersClaimed) return false;

    // Cast rather than regenerate the whole database type file — see the note
    // in AGENTS.md about what regenerating it deletes.
    const client = supabase as unknown as {
      rpc: (fn: string) => Promise<{
        data: { ok?: boolean; reason?: string } | null;
        error: { message: string } | null;
      }>;
    };

    const { data, error } = await client.rpc("claim_daily_vip_powers");

    if (error) {
      console.error("Error claiming daily power-ups:", error);
      toast.error(tStandalone("extra.vipPowersClaimFailed"));
      return false;
    }

    if (!data?.ok) {
      // already_claimed is not a failure worth a message — the state below
      // catches this device up with what the server already knows.
      if (data?.reason === "already_claimed") {
        setState(prev => ({ ...prev, powersClaimed: true }));
      }
      return false;
    }

    setState(prev => ({ ...prev, powersClaimed: true }));
    toast.success(tStandalone("extra.vipPowersReceived"));
    return true;
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
