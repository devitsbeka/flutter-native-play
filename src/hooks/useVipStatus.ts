import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { addDays, addMonths, isAfter } from "date-fns";

export interface VipSubscription {
  id: string;
  user_id: string;
  vip_tier: string;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  friend_invites_remaining?: number;
}

export type VipDuration = "day" | "week" | "month";

export const VIP_PRICES: Record<VipDuration, number> = {
  day: 3,
  week: 12,
  month: 35,
};

// Base benefits for all PRO users
export const VIP_BENEFITS = [
  { icon: "⭐", title: "2x XP", description: "ორმაგი გამოცდილება ყველა თამაშში" },
  { icon: "🎰", title: "+3 სპინი", description: "დამატებითი ყოველდღიური სპინები" },
  { icon: "🎨", title: "ექსკლუზიური ჩარჩოები", description: "VIP-ისთვის განკუთვნილი ავატარის ჩარჩოები" },
  { icon: "⚡", title: "უფასო ძალები", description: "ყოველდღიური უფასო power-ups" },
  { icon: "👑", title: "VIP ბეჯი", description: "ოქროს გვირგვინის ბეჯი პროფილზე" },
  { icon: "🚫", title: "რეკლამების გარეშე", description: "სრული თამაში რეკლამების გარეშე" },
];

// Tier-specific benefits for different VIP levels
export const VIP_BENEFITS_BY_TIER = {
  pro: [
    { icon: "⭐", title: "2x XP", description: "ორმაგი გამოცდილება ყველა თამაშში" },
    { icon: "🎰", title: "+3 სპინი", description: "დამატებითი ყოველდღიური სპინები" },
    { icon: "🚫", title: "რეკლამების გარეშე", description: "სრული თამაში რეკლამების გარეშე" },
    { icon: "👑", title: "VIP ბეჯი", description: "ოქროს გვირგვინის ბეჯი პროფილზე" },
  ],
  pro_plus: [
    { icon: "⭐", title: "2x XP", description: "ორმაგი გამოცდილება ყველა თამაშში" },
    { icon: "🎰", title: "+3 სპინი", description: "დამატებითი ყოველდღიური სპინები" },
    { icon: "🚫", title: "რეკლამების გარეშე", description: "სრული თამაში რეკლამების გარეშე" },
    { icon: "👑", title: "VIP ბეჯი", description: "ოქროს გვირგვინის ბეჯი პროფილზე" },
    { icon: "🎨", title: "ექსკლუზიური ჩარჩოები", description: "3 VIP-ისთვის განკუთვნილი ჩარჩო" },
    { icon: "⚡", title: "უფასო ძალები", description: "ყოველდღიურად 4 უფასო power-up" },
    { icon: "🎁", title: "გაძლიერებული ჯილდოები", description: "+50% ყოველდღიური ჯილდო" },
  ],
};

// Cache key for localStorage
const VIP_CACHE_KEY = "cached_vip_status";

export function useVipStatus() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<VipSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  // Optimistically use cached value, fallback to false for new users
  const [isVip, setIsVip] = useState(() => {
    try {
      const cached = localStorage.getItem(VIP_CACHE_KEY);
      return cached === "true";
    } catch {
      return false;
    }
  });

  // Fetch VIP status
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsVip(false);
      setLoading(false);
      return;
    }

    const fetchVipStatus = async () => {
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
          // Cache the VIP status
          try { localStorage.setItem(VIP_CACHE_KEY, String(isActive)); } catch {}
        } else {
          setSubscription(null);
          setIsVip(false);
          try { localStorage.setItem(VIP_CACHE_KEY, "false"); } catch {}
        }
      } catch (error) {
        // Silently handle - user just doesn't have VIP
        setSubscription(null);
        setIsVip(false);
        try { localStorage.setItem(VIP_CACHE_KEY, "false"); } catch {}
      } finally {
        setLoading(false);
      }
    };

    fetchVipStatus();
  }, [user]);

  const activateVip = async (duration: VipDuration): Promise<boolean> => {
    if (!user) return false;

    try {
      const now = new Date();
      const expiresAt = duration === "day" 
        ? addDays(now, 1) 
        : duration === "week" 
          ? addDays(now, 7) 
          : addMonths(now, 1);

      // Check if user already has a subscription
      if (subscription) {
        // Extend existing subscription
        const currentExpiry = new Date(subscription.expires_at);
        const newExpiry = isAfter(currentExpiry, now) 
          ? duration === "day" 
            ? addDays(currentExpiry, 1) 
            : duration === "week" 
              ? addDays(currentExpiry, 7) 
              : addMonths(currentExpiry, 1)
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
        // Create new subscription
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
      toast.success("VIP აქტივირებულია! 👑");
      return true;
    } catch (error) {
      console.error("Error activating VIP:", error);
      toast.error("VIP აქტივაცია ვერ მოხერხდა");
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

  // Helper methods for VIP benefits
  const getXpMultiplier = (): number => isVip ? 2 : 1;
  const getMaxDailySpins = (): number => isVip ? 4 : 1;
  const shouldSkipGameStake = (): boolean => isVip;
  const canAccessVipFrames = (): boolean => isVip;

  // Get tier-specific benefits
  const getTierBenefits = () => {
    if (!subscription?.vip_tier) return VIP_BENEFITS_BY_TIER.pro;
    return VIP_BENEFITS_BY_TIER[subscription.vip_tier as keyof typeof VIP_BENEFITS_BY_TIER] || VIP_BENEFITS_BY_TIER.pro;
  };

  // Check if user is PRO Plus tier (for enhanced rewards)
  const isProPlus = (): boolean => subscription?.vip_tier === 'pro_plus';

  // Get daily reward multiplier (1.5x for PRO Plus)
  const getDailyRewardMultiplier = (): number => isProPlus() ? 1.5 : 1;

  return {
    subscription,
    isVip,
    loading,
    activateVip,
    getDaysRemaining,
    getXpMultiplier,
    getMaxDailySpins,
    shouldSkipGameStake,
    canAccessVipFrames,
    benefits: VIP_BENEFITS,
    tierBenefits: getTierBenefits(),
    isProPlus,
    getDailyRewardMultiplier,
    prices: VIP_PRICES,
  };
}
