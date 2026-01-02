import { useState, useEffect, useCallback, useRef } from "react";
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

// Shared cache to persist data across component instances
let cachedPowerUps: Record<PowerUpType, number> | null = null;
let cachedUserId: string | null = null;

export function useUserPowerUps() {
  const { user } = useAuth();
  const [powerUps, setPowerUps] = useState<Record<PowerUpType, number>>(
    // Use cached data if available for the same user
    cachedUserId === user?.id && cachedPowerUps ? cachedPowerUps : DEFAULT_POWER_UPS
  );
  const [isLoading, setIsLoading] = useState(
    // Not loading if we have cached data for this user
    !(cachedUserId === user?.id && cachedPowerUps)
  );
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  // Fetch power-ups from database
  const fetchPowerUps = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    // Skip if already fetched for this user in this session
    if (fetchedRef.current && cachedUserId === user.id && cachedPowerUps) {
      setPowerUps(cachedPowerUps);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("user_power_ups")
        .select("power_up_type, quantity")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const powerUpMap: Record<PowerUpType, number> = { ...DEFAULT_POWER_UPS };
        data.forEach((item) => {
          powerUpMap[item.power_up_type as PowerUpType] = item.quantity ?? 0;
        });
        setPowerUps(powerUpMap);
        // Cache the result
        cachedPowerUps = powerUpMap;
        cachedUserId = user.id;
        fetchedRef.current = true;
      } else {
        // Initialize power-ups for new user
        await initializePowerUps();
      }
    } catch (err) {
      console.error("Error fetching power-ups:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initialize default power-ups for new user
  const initializePowerUps = async () => {
    if (!user?.id) return;

    const inserts = Object.entries(DEFAULT_POWER_UPS).map(([type, quantity]) => ({
      user_id: user.id,
      power_up_type: type,
      quantity,
    }));

    const { error: insertError } = await supabase
      .from("user_power_ups")
      .insert(inserts);

    if (insertError) {
      console.error("Error initializing power-ups:", insertError);
    } else {
      setPowerUps(DEFAULT_POWER_UPS);
      cachedPowerUps = DEFAULT_POWER_UPS;
      cachedUserId = user.id;
    }
  };

  // Use a power-up (decrement quantity)
  const usePowerUp = async (type: PowerUpType): Promise<boolean> => {
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

    const updated = { ...powerUps, [type]: newQuantity };
    setPowerUps(updated);
    cachedPowerUps = updated;
    return true;
  };

  // Add power-ups (e.g., from rewards)
  const addPowerUp = async (type: PowerUpType, amount: number): Promise<boolean> => {
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

    const updated = { ...powerUps, [type]: newQuantity };
    setPowerUps(updated);
    cachedPowerUps = updated;
    return true;
  };

  useEffect(() => {
    fetchPowerUps();
  }, [fetchPowerUps]);

  return {
    powerUps,
    isLoading,
    error,
    usePowerUp,
    addPowerUp,
    refetch: fetchPowerUps,
  };
}
