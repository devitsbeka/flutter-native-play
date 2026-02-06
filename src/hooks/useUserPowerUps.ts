import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

  // Use a power-up (decrement quantity)
  const usePowerUp = useCallback(
    async (type: PowerUpType): Promise<boolean> => {
      if (!user?.id || powerUps[type] <= 0) return false;

      const newQuantity = powerUps[type] - 1;

      const { error: updateError } = await supabase
        .from("user_power_ups")
        .update({ quantity: newQuantity })
        .eq("user_id", user.id)
        .eq("power_up_type", type);

      if (updateError) {
        console.error("Error using power-up:", updateError);
        return false;
      }

      // Optimistic update
      queryClient.setQueryData<Record<PowerUpType, number>>(queryKey, (prev) =>
        prev ? { ...prev, [type]: newQuantity } : prev
      );
      return true;
    },
    [user?.id, powerUps, queryClient, queryKey]
  );

  // Add power-ups (e.g., from rewards)
  const addPowerUp = useCallback(
    async (type: PowerUpType, amount: number): Promise<boolean> => {
      if (!user?.id) return false;

      const newQuantity = powerUps[type] + amount;

      const { error: updateError } = await supabase
        .from("user_power_ups")
        .update({ quantity: newQuantity })
        .eq("user_id", user.id)
        .eq("power_up_type", type);

      if (updateError) {
        console.error("Error adding power-up:", updateError);
        return false;
      }

      // Optimistic update
      queryClient.setQueryData<Record<PowerUpType, number>>(queryKey, (prev) =>
        prev ? { ...prev, [type]: newQuantity } : prev
      );
      return true;
    },
    [user?.id, powerUps, queryClient, queryKey]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    powerUps,
    isLoading,
    error: error as Error | null,
    usePowerUp,
    addPowerUp,
    refetch,
  };
}
