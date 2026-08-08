import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { addDays, addMonths, isAfter } from "date-fns";
import { t } from "@/utils/standaloneTranslation";

export interface VipSubscription {
  id: string;
  user_id: string;
  vip_tier: string;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  friend_invites_remaining?: number;
}

export type VipDuration = "day" | "week" | "month" | "10days";

export const VIP_PRICES: Record<VipDuration, number> = {
  day: 3,
  week: 12,
  month: 35,
  "10days": 0,
};

// Base benefits for all PRO users
// VIP_BENEFITS uses translation keys - consumers should call t() on descriptions
export const VIP_BENEFITS = [
  { icon: "⭐", title: "2x XP", descriptionKey: "extra.vip2xXpDesc" },
  { icon: "🎰", title: "+3 Spins", descriptionKey: "extra.vipExtraSpinsDesc" },
  { icon: "⚡", title: "Free Powers", descriptionKey: "extra.vipFreePowersDesc" },
  { icon: "👑", title: "VIP Badge", descriptionKey: "extra.vipBadgeDesc" },
  { icon: "🚫", title: "No Ads", descriptionKey: "extra.vipNoAdsDesc" },
];

// Tier-specific benefits for different VIP levels
export const VIP_BENEFITS_BY_TIER = {
  pro: [
    { icon: "⭐", title: "2x XP", descriptionKey: "extra.vip2xXpDesc" },
    { icon: "🎰", title: "+3 Spins", descriptionKey: "extra.vipExtraSpinsDesc" },
    { icon: "🚫", title: "No Ads", descriptionKey: "extra.vipNoAdsDesc" },
    { icon: "👑", title: "VIP Badge", descriptionKey: "extra.vipBadgeDesc" },
  ],
  pro_plus: [
    { icon: "⭐", title: "2x XP", descriptionKey: "extra.vip2xXpDesc" },
    { icon: "🎰", title: "+3 Spins", descriptionKey: "extra.vipExtraSpinsDesc" },
    { icon: "🚫", title: "No Ads", descriptionKey: "extra.vipNoAdsDesc" },
    { icon: "👑", title: "VIP Badge", descriptionKey: "extra.vipBadgeDesc" },
    { icon: "⚡", title: "Free Powers", descriptionKey: "extra.vipFreePowersDesc" },
    { icon: "🎁", title: "Enhanced Rewards", descriptionKey: "extra.vipEnhancedRewardsDesc" },
  ],
};

// Cache key for localStorage
const VIP_CACHE_KEY = "cached_vip_status";

// Admin accounts get lifetime PRO (a concrete far-future date — the client
// parses expires_at with new Date(), which can't handle 'infinity').
const LIFETIME_EXPIRES_AT = "2126-01-01T00:00:00.000Z";
const isLifetime = (expiresAt: string) =>
  new Date(expiresAt).getTime() >= new Date("2100-01-01T00:00:00Z").getTime();

// Individually granted lifetime PRO accounts (self-granted on their own
// login, like admins — RLS only lets a user write their own subscription row)
const LIFETIME_PRO_USER_IDS = new Set<string>([
  "a22491af-e2a1-4072-bee0-a2f804393a77", // beka
]);

interface VipContextType {
  subscription: VipSubscription | null;
  isVip: boolean;
  loading: boolean;
  activateVip: (duration: VipDuration) => Promise<boolean>;
  getDaysRemaining: () => number;
  getXpMultiplier: () => number;
  getMaxDailySpins: () => number;
  shouldSkipGameStake: () => boolean;
  benefits: typeof VIP_BENEFITS;
  tierBenefits: typeof VIP_BENEFITS_BY_TIER.pro;
  isProPlus: () => boolean;
  getDailyRewardMultiplier: () => number;
  prices: typeof VIP_PRICES;
}

const VipContext = createContext<VipContextType | null>(null);

export function VipProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<VipSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(() => {
    try {
      if (sessionStorage.getItem("referral_welcome")) {
        localStorage.setItem(VIP_CACHE_KEY, "true");
        return true;
      }
      const cached = localStorage.getItem(VIP_CACHE_KEY);
      return cached === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsVip(false);
      setLoading(false);
      return;
    }

    const fetchVipStatus = async (retryCount = 0) => {
      try {
        const { data, error } = await supabase
          .from("vip_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSubscription(data as VipSubscription);
          const isActive = isAfter(new Date(data.expires_at), new Date());
          setIsVip(isActive);
          try { localStorage.setItem(VIP_CACHE_KEY, String(isActive)); } catch {}
        } else if (sessionStorage.getItem("referral_welcome") && retryCount < 2) {
          setTimeout(() => fetchVipStatus(retryCount + 1), 1500);
          return;
        } else {
          setSubscription(null);
          setIsVip(false);
          try { localStorage.setItem(VIP_CACHE_KEY, "false"); } catch {}
        }
      } catch (error) {
        console.error("[VipContext] Error fetching VIP status:", error);
      } finally {
        if (retryCount === 0) setLoading(false);
      }
    };

    // Admins and individually granted accounts keep lifetime PRO. RLS lets a
    // user write only their own subscription row, so this self-grant runs
    // client-side on login and heals itself if the row is ever removed or
    // shortened.
    const ensureAdminLifetimePro = async () => {
      if (!LIFETIME_PRO_USER_IDS.has(user.id)) {
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!adminRole) return;
      }

      const { data: existing } = await supabase
        .from("vip_subscriptions")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing && isLifetime(existing.expires_at)) return;

      const { error } = existing
        ? await supabase
            .from("vip_subscriptions")
            .update({ vip_tier: "pro", expires_at: LIFETIME_EXPIRES_AT })
            .eq("user_id", user.id)
        : await supabase
            .from("vip_subscriptions")
            .insert({ user_id: user.id, vip_tier: "pro", expires_at: LIFETIME_EXPIRES_AT });
      if (error) {
        console.error("[VipContext] Admin lifetime PRO self-grant failed:", error);
        return;
      }
      fetchVipStatus();
    };

    fetchVipStatus();
    ensureAdminLifetimePro();

    const channel = supabase
      .channel("vip-status-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vip_subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => { fetchVipStatus(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const activateVip = async (duration: VipDuration): Promise<boolean> => {
    if (!user) return false;

    try {
      const now = new Date();
      const durationDays = duration === "day" ? 1 : duration === "week" ? 7 : duration === "10days" ? 10 : 0;
      const expiresAt = durationDays > 0
        ? addDays(now, durationDays)
        : addMonths(now, 1);

      if (subscription) {
        const currentExpiry = new Date(subscription.expires_at);
        const newExpiry = isAfter(currentExpiry, now)
          ? (durationDays > 0 ? addDays(currentExpiry, durationDays) : addMonths(currentExpiry, 1))
          : expiresAt;

        const { error } = await supabase
          .from("vip_subscriptions")
          .update({
            expires_at: newExpiry.toISOString(),
            vip_tier: "standard",
          })
          .eq("user_id", user.id);

        if (error) throw error;

        setSubscription((prev) => prev ? { ...prev, expires_at: newExpiry.toISOString() } : null);
      } else {
        const { data, error } = await supabase
          .from("vip_subscriptions")
          .insert({
            user_id: user.id,
            vip_tier: "standard",
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        setSubscription(data as VipSubscription);
      }

      setIsVip(true);
      toast.success(t("extra.vipActivatedToast"));
      return true;
    } catch (error) {
      console.error("Error activating VIP:", error);
      toast.error(t("extra.vipActivationFailed"));
      return false;
    }
  };

  const getDaysRemaining = (): number => {
    if (!subscription || !isVip) return 0;
    const now = new Date();
    const expiry = new Date(subscription.expires_at);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getXpMultiplier = (): number => isVip ? 2 : 1;
  const getMaxDailySpins = (): number => isVip ? 4 : 1;
  const shouldSkipGameStake = (): boolean => isVip;

  const getTierBenefits = () => {
    if (!subscription?.vip_tier) return VIP_BENEFITS_BY_TIER.pro;
    return VIP_BENEFITS_BY_TIER[subscription.vip_tier as keyof typeof VIP_BENEFITS_BY_TIER] || VIP_BENEFITS_BY_TIER.pro;
  };

  const isProPlus = (): boolean => subscription?.vip_tier === 'pro_plus';
  const getDailyRewardMultiplier = (): number => isProPlus() ? 1.5 : 1;

  // user included beyond the state deps because activateVip closes over it
  const value: VipContextType = useMemo(
    () => ({
      subscription,
      isVip,
      loading,
      activateVip,
      getDaysRemaining,
      getXpMultiplier,
      getMaxDailySpins,
      shouldSkipGameStake,
      benefits: VIP_BENEFITS,
      tierBenefits: getTierBenefits(),
      isProPlus,
      getDailyRewardMultiplier,
      prices: VIP_PRICES,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscription, isVip, loading, user]
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVipStatus(): VipContextType {
  const ctx = useContext(VipContext);
  if (!ctx) throw new Error("useVipStatus must be used within VipProvider");
  return ctx;
}
