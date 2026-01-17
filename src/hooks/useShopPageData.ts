import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isAfter, addDays, addMonths } from "date-fns";

export type PowerUpType = "5050" | "freeze" | "replace" | "time-drain";

export interface ShopPageData {
  powerUps: Record<PowerUpType, number>;
  isVip: boolean;
  vipExpiresAt: string | null;
  unlockedFrames: Set<string>;
  equippedFrame: string | null;
}

const DEFAULT_POWER_UPS: Record<PowerUpType, number> = {
  "5050": 2,
  "freeze": 1,
  "replace": 1,
  "time-drain": 1,
};

export function useShopPageData() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["shopPageData", user?.id],
    queryFn: async (): Promise<ShopPageData> => {
      if (!user?.id) {
        return {
          powerUps: DEFAULT_POWER_UPS,
          isVip: false,
          vipExpiresAt: null,
          unlockedFrames: new Set(),
          equippedFrame: null,
        };
      }

      // Fetch all shop data in parallel
      const [powerUpsResult, vipResult, framesResult] = await Promise.all([
        supabase
          .from("user_power_ups")
          .select("power_up_type, quantity")
          .eq("user_id", user.id),
        supabase
          .from("vip_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_avatar_frames")
          .select("frame_id, is_equipped")
          .eq("user_id", user.id),
      ]);

      // Process power-ups
      let powerUps = { ...DEFAULT_POWER_UPS };
      if (powerUpsResult.data && powerUpsResult.data.length > 0) {
        powerUpsResult.data.forEach((item) => {
          powerUps[item.power_up_type as PowerUpType] = item.quantity ?? 0;
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
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - shop data doesn't change often
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    data: data || {
      powerUps: DEFAULT_POWER_UPS,
      isVip: false,
      vipExpiresAt: null,
      unlockedFrames: new Set<string>(),
      equippedFrame: null,
    },
    isLoading,
    error,
    refetch,
  };
}
