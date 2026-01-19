import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";
import { isAfter } from "date-fns";

const DEFAULT_POWER_UPS = {
  "5050": 2,
  freeze: 1,
  replace: 1,
  "time-drain": 1,
};

async function fetchShopData(userId: string) {
  const [powerUpsResult, vipResult, framesResult] = await Promise.all([
    supabase
      .from("user_power_ups")
      .select("power_up_type, quantity")
      .eq("user_id", userId),
    supabase
      .from("vip_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_avatar_frames")
      .select("frame_id, is_equipped")
      .eq("user_id", userId),
  ]);

  // Process power-ups
  const powerUps = { ...DEFAULT_POWER_UPS };
  if (powerUpsResult.data && powerUpsResult.data.length > 0) {
    powerUpsResult.data.forEach((item) => {
      (powerUps as any)[item.power_up_type] = item.quantity ?? 0;
    });
  }

  // Process VIP status
  let isVip = false;
  let vipExpiresAt: string | null = null;
  if (vipResult.data) {
    isVip = isAfter(new Date(vipResult.data.expires_at), new Date());
    vipExpiresAt = vipResult.data.expires_at;
  }

  // Process frames
  const unlockedFrames = new Set(framesResult.data?.map((f) => f.frame_id) || []);
  const equippedFrame = framesResult.data?.find((f) => f.is_equipped)?.frame_id || null;

  return {
    powerUps,
    isVip,
    vipExpiresAt,
    unlockedFrames,
    equippedFrame,
  };
}

export function useShopPrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchShopData = useCallback(() => {
    if (!user?.id) return;

    // Check if data already exists and is fresh
    const existingData = queryClient.getQueryData(["shopPageData", user.id]);
    if (existingData) return;

    // Prefetch in background
    queryClient.prefetchQuery({
      queryKey: ["shopPageData", user.id],
      queryFn: () => fetchShopData(user.id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient, user?.id]);

  // Preload the PowerUps page chunk
  const preloadShopPage = useCallback(() => {
    import("@/pages/PowerUps");
  }, []);

  return {
    prefetchShopData,
    preloadShopPage,
  };
}
