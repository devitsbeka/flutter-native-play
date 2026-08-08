import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ShopPageData } from "@/hooks/useShopPageData";

export type PowerUpType = "5050" | "freeze" | "replace" | "time-drain";

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

  // Initialize power-ups for new user
  const inserts = Object.entries(DEFAULT_POWER_UPS).map(([type, quantity]) => ({
    user_id: userId,
    power_up_type: type,
    quantity,
  }));

  const { error: insertError } = await supabase
    .from("user_power_ups")
    .insert(inserts);

  if (insertError) {
    console.error("Error initializing power-ups:", insertError);
  }

  return { ...DEFAULT_POWER_UPS };
}

// Fallback for when the adjust_power_up migration isn't applied yet:
// read the fresh server quantity, then conditionally write on top of it
// (guarded by .eq("quantity", current) so concurrent writers can't be clobbered).
async function fallbackAdjust(
  userId: string,
  type: PowerUpType,
  delta: number
): Promise<number | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: row, error: readError } = await supabase
      .from("user_power_ups")
      .select("quantity")
      .eq("user_id", userId)
      .eq("power_up_type", type)
      .maybeSingle();

    if (readError) {
      console.error("Error reading power-up quantity:", readError);
      return null;
    }

    const current = row?.quantity ?? 0;
    const next = Math.max(0, current + delta);

    if (!row) {
      const { error: insertError } = await supabase
        .from("user_power_ups")
        .insert({ user_id: userId, power_up_type: type, quantity: next });
      if (insertError) {
        // Unique violation means another writer created the row — retry the update path
        continue;
      }
      return next;
    }

    const { data: updated, error: updateError } = await supabase
      .from("user_power_ups")
      .update({ quantity: next })
      .eq("user_id", userId)
      .eq("power_up_type", type)
      .eq("quantity", current)
      .select("quantity");

    if (updateError) {
      console.error("Error updating power-up quantity:", updateError);
      return null;
    }
    if (updated && updated.length > 0) return next;
    // Lost the race against a concurrent write — re-read and retry once
  }
  return null;
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
    console.warn("adjust_power_up RPC failed, falling back to direct update:", error.message);
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

      let newQuantity = await adjustPowerUpRpc(type, delta);
      if (newQuantity === null) {
        newQuantity = await fallbackAdjust(user.id, type, delta);
      }
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

  // Add power-ups (e.g., from rewards)
  const addPowerUp = useCallback(
    async (type: PowerUpType, amount: number): Promise<boolean> => {
      if (!user?.id || amount <= 0) return false;
      const newQuantity = await adjustPowerUp(type, amount);
      return newQuantity !== null;
    },
    [user?.id, adjustPowerUp]
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
    addPowerUp,
    refetch,
  };
}
