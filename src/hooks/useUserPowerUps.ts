import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ShopPageData } from "@/hooks/useShopPageData";

export type PowerUpType = "5050" | "freeze" | "replace" | "time-drain";

/**
 * Why a power-up is being awarded.
 *
 * Each has its own per-award and per-day ceiling in `power_up_grant_limits`.
 * The kind is a required argument rather than an optional one so that adding a
 * new award path is a compile error until someone decides what it costs —
 * the same rule `RewardKind` applies to coins and gems.
 */
export type PowerUpRewardKind = "spin" | "ad_reward" | "level_up" | "chest" | "mission";

export interface UserPowerUp {
  power_up_type: PowerUpType;
  quantity: number;
}

const DEFAULT_POWER_UPS: Record<PowerUpType, number> = {
  "5050": 2,
  "freeze": 1,
  "replace": 1,
  "time-drain": 1,
};

async function fetchPowerUps(userId: string): Promise<Record<PowerUpType, number>> {
  const { data, error } = await supabase
    .from("user_power_ups")
    .select("power_up_type, quantity")
    .eq("user_id", userId);

  if (error) throw error;

  if (data && data.length > 0) {
    const powerUpMap: Record<PowerUpType, number> = { ...DEFAULT_POWER_UPS };
    data.forEach((item) => {
      powerUpMap[item.power_up_type as PowerUpType] = item.quantity ?? 0;
    });
    return powerUpMap;
  }

  // Initialize power-ups for a new user.
  //
  // Was a direct INSERT, which the "users can insert their own power-ups"
  // policy allowed — and that policy is what let anyone write themselves any
  // quantity they liked. The policy is gone (20261104110000) and the starting
  // amounts are decided server-side by this function, which is the same set as
  // DEFAULT_POWER_UPS above.
  const { data: seeded, error: seedError } = await supabase.rpc("ensure_default_power_ups");

  if (seedError) {
    console.error("Error initializing power-ups:", seedError);
    return { ...DEFAULT_POWER_UPS };
  }

  const powerUpMap: Record<PowerUpType, number> = { ...DEFAULT_POWER_UPS };
  for (const row of seeded ?? []) {
    powerUpMap[row.power_type as PowerUpType] = row.owned ?? 0;
  }
  return powerUpMap;
}

// Atomic delta adjustment via SECURITY DEFINER RPC; returns the new quantity
// or null if the RPC failed (e.g. migration not applied yet).
async function adjustPowerUpRpc(type: PowerUpType, delta: number): Promise<number | null> {
  // Cast needed until Supabase types are regenerated after the migration
  // (supabase/migrations/20260724140000_power_up_rpc.sql) is applied
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: number | null; error: { message: string } | null }>)("adjust_power_up", {
    p_type: type,
    p_delta: delta,
  });
  if (error) {
    console.error("adjust_power_up failed:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

export function useUserPowerUps() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["user-power-ups", user?.id];

  const { data: powerUps = DEFAULT_POWER_UPS, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchPowerUps(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 min — power-ups change rarely
    gcTime: 10 * 60 * 1000,
  });

  const adjustPowerUp = useCallback(
    async (type: PowerUpType, delta: number): Promise<number | null> => {
      if (!user?.id) return null;

      const newQuantity = await adjustPowerUpRpc(type, delta);
      if (newQuantity === null) return null;

      // Sync cache from the authoritative server value
      const quantity = newQuantity;
      queryClient.setQueryData<Record<PowerUpType, number>>(queryKey, (prev) =>
        prev ? { ...prev, [type]: quantity } : prev
      );
      // The shop page renders counts from its consolidated query — keep it in
      // sync too, or purchases don't show up there until a hard refresh.
      queryClient.setQueryData<ShopPageData>(["shopPageData", user.id], (prev) =>
        prev ? { ...prev, powerUps: { ...prev.powerUps, [type]: quantity } } : prev
      );
      return quantity;
    },
    [user?.id, queryClient, queryKey]
  );

  // Use a power-up (decrement quantity)
  const usePowerUp = useCallback(
    async (type: PowerUpType): Promise<boolean> => {
      if (!user?.id || powerUps[type] <= 0) return false;
      const newQuantity = await adjustPowerUp(type, -1);
      return newQuantity !== null;
    },
    [user?.id, powerUps, adjustPowerUp]
  );

  /**
   * Award a power-up the player earned — a spin segment, a rewarded ad, a
   * level-up.
   *
   * Takes a `kind` now, and that is the whole point. This used to be
   * `adjustPowerUp(type, +amount)`, and `adjust_power_up` accepted any
   * positive delta from any signed-in caller, so one console line was an
   * unlimited supply. It is debit-only now; awards go through
   * `grant_reward_power_up`, which bounds the amount per call and per day
   * against `power_up_grant_limits` — the same trade
   * `credit_gameplay_reward` makes for coins.
   *
   * A rejection here is not transient. It means the award was bigger than the
   * kind allows or the day's allowance is spent.
   */
  const awardPowerUp = useCallback(
    async (kind: PowerUpRewardKind, type: PowerUpType, amount = 1): Promise<boolean> => {
      if (!user?.id || amount <= 0) return false;

      const { data, error } = await supabase.rpc("grant_reward_power_up", {
        p_kind: kind,
        p_type: type,
        p_amount: amount,
      });

      if (error) {
        console.error(`Error awarding ${kind} power-up:`, error.message);
        return false;
      }

      const quantity = typeof data === "number" ? data : null;
      if (quantity === null) return false;

      queryClient.setQueryData<Record<PowerUpType, number>>(queryKey, (prev) =>
        prev ? { ...prev, [type]: quantity } : prev
      );
      queryClient.setQueryData<ShopPageData>(["shopPageData", user.id], (prev) =>
        prev ? { ...prev, powerUps: { ...prev.powerUps, [type]: quantity } } : prev
      );
      return true;
    },
    [user?.id, queryClient, queryKey]
  );

  /**
   * Buy power-ups with coins.
   *
   * The price is `powerup_price_*` in economy_config, read server-side. It was
   * `spendCoins(REWARDS.POWER_UP_PRICES[type])` followed by a separate grant,
   * with the price coming out of the bundle — so both halves were the
   * client's to choose.
   */
  const buyPowerUp = useCallback(
    async (type: PowerUpType, quantity: number): Promise<boolean> => {
      if (!user?.id || quantity <= 0) return false;

      const { data, error } = await supabase.rpc("purchase_power_up", {
        p_type: type,
        p_quantity: quantity,
      });

      if (error) {
        console.error(`Error buying ${type}:`, error.message);
        return false;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return false;

      queryClient.setQueryData<Record<PowerUpType, number>>(queryKey, (prev) =>
        prev ? { ...prev, [type]: row.owned } : prev
      );
      queryClient.invalidateQueries({ queryKey: ["shopPageData", user.id] });
      return true;
    },
    [user?.id, queryClient, queryKey]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["shopPageData", user?.id] });
  }, [queryClient, queryKey, user?.id]);

  return {
    powerUps,
    isLoading,
    error: error as Error | null,
    usePowerUp,
    awardPowerUp,
    buyPowerUp,
    refetch,
  };
}
