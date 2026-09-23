import { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { isAfter } from "date-fns";
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

export type VipDuration = "day" | "2days" | "week" | "month" | "10days";

/**
 * How long each duration grants now lives in the `grant_vip_days` SQL
 * function, because an expiry date the client computes is an expiry date the
 * client can choose. The mapping that used to be here is reproduced there
 * verbatim, including the calendar-month special case for 'month'.
 *
 * Keep the two in step: adding a duration to VipDuration means adding a
 * branch to that function, or the grant fails loudly with "Unknown VIP
 * duration" rather than silently handing out the wrong amount of time.
 */

/**
 * VIP prices are REWARDS.VIP_PRICES in src/config/rewardConfig.ts, and on the
 * server they are `shop_catalog`. There used to be a third table right here —
 * `day: 3, week: 12, month: 35` — exported on this context as `prices`, read
 * by nothing, and disagreeing with the shop by a factor of twenty.
 *
 * It is gone rather than corrected, for the reason utils/currency.ts was
 * gutted rather than fixed: a price table nobody reads, sitting next to a
 * price surface, is a table the next person reaches for.
 */

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

// The lifetime-PRO allowlist moved into ensure_admin_lifetime_pro(), next to
// the admin-role check it sits beside. Both now run somewhere the client
// cannot reach around them.

interface VipContextType {
  subscription: VipSubscription | null;
  isVip: boolean;
  loading: boolean;
  refresh: () => void;
  /**
   * Turn PRO on now, from a purchase StoreKit has already confirmed.
   *
   * Everything that gates on PRO — the locked game modes, Create Room, the
   * badge, the stake skip — reads `isVip` and `subscription.vip_tier` from
   * here. Until this existed, the only way either changed was a round trip:
   * verify-receipt cold-starting, asking RevenueCat over HTTP, writing
   * vip_subscriptions, then a re-read of that row which itself retries at
   * 1200ms when the row is not visible yet. Measured on a device that was
   * about eight seconds of the App Store saying "you're subscribed" and the
   * app still showing every PRO feature locked.
   *
   * None of that wait is needed to decide what to draw. `purchasePackage`
   * resolves with a StoreKit-verified `customerInfo` the moment the sheet
   * closes, and that is what says this Apple ID now owns the subscription. The
   * server round trip still happens and still decides what is *persisted* —
   * entitlements stay enforced in the database (CLAUDE.md 3), and the
   * reconciling fetch below corrects this if it ever disagrees. This only
   * decides what the screen shows in the meantime.
   */
  applyEntitlement: (tier: string, expiresAt: string) => void;
  getDaysRemaining: () => number;
  getXpMultiplier: () => number;
  getMaxDailySpins: () => number;
  benefits: typeof VIP_BENEFITS;
  tierBenefits: typeof VIP_BENEFITS_BY_TIER.pro;
  isProPlus: () => boolean;
  getDailyRewardMultiplier: () => number;
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

  // `refresh` lives outside the effect but has to re-run the fetch the effect
  // owns, so the effect publishes it here.
  const fetchVipStatusRef = useRef<(() => void) | null>(null);

  /**
   * How long a just-purchased entitlement outranks the database.
   *
   * applyEntitlement turns PRO on from a StoreKit-verified purchase and then
   * asks the server to confirm it. Those two raced, and the server won: the
   * re-read landed a few hundred milliseconds later, found the OLD row — absent,
   * or present and expired — and set isVip back to false before verify-receipt
   * had written anything. The optimistic update reverted itself, so a completed
   * PRO purchase showed its success modal over a UI that still said non-PRO.
   *
   * Inside this window a fetch may only ever UPGRADE. If the row does not yet
   * confirm the purchase, it retries instead of revoking. verify-receipt takes
   * ~3.5s on a device, so this has to outlast that with room to spare.
   */
  const optimisticUntilRef = useRef<number>(0);

  /**
   * Whether a fetch has ever confirmed an active subscription this session.
   *
   * The read below can come back with **no row** for reasons that have nothing
   * to do with owning PRO: the query fires before the session token is fully
   * attached and RLS hides the row — on launch, on resume, and around a token
   * refresh. It retried twice and then revoked, so PRO blinked off on a live
   * subscriber, the shop card fell back to a Buy button, and tapping it got
   * Apple's "you're already subscribed" followed by our own congratulations.
   *
   * A genuine downgrade — cancelled, expired, refunded — always arrives as a
   * row whose expires_at is in the past, and that still revokes immediately.
   * An absent row after we have already seen a live one does not, because
   * "the server did not answer" is not the same fact as "you no longer own
   * this". Entitlements are still enforced server-side; this only governs what
   * the screen draws.
   */
  const confirmedActiveRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsVip(false);
      setLoading(false);
      fetchVipStatusRef.current = null;
      // The cache seeds `isVip` on the next mount, so leaving it set means the
      // next person to sign in on this phone starts the session believing they
      // are PRO — and a signed-out device keeps showing PRO surfaces. It is a
      // paint-time hint belonging to one account, not a device fact.
      try { localStorage.removeItem(VIP_CACHE_KEY); } catch { /* private mode */ }
      confirmedActiveRef.current = false;
      optimisticUntilRef.current = 0;
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

        const active = data ? isAfter(new Date(data.expires_at), new Date()) : false;

        // A purchase this session outranks a row that has not caught up yet.
        // Never revoke inside the grace window — come back instead.
        if (!active && Date.now() < optimisticUntilRef.current) {
          setTimeout(() => fetchVipStatus(0), 1000);
          return;
        }

        if (data) {
          setSubscription(data as VipSubscription);
          setIsVip(active);
          // Confirmed by the server: the optimistic window has served its
          // purpose and must not keep suppressing a later, genuine downgrade
          // (a cancellation, an expiry, a refund).
          if (active) {
            optimisticUntilRef.current = 0;
            confirmedActiveRef.current = true;
          } else {
            // An expired row is the server stating a fact. Believe it.
            confirmedActiveRef.current = false;
          }
          try { localStorage.setItem(VIP_CACHE_KEY, String(active)); } catch {}
        } else if (retryCount < 2) {
          // "No row" on a fresh load can be an auth race — the query fires
          // before the session token is fully attached and RLS hides the row.
          // Re-check before revoking a cached PRO state, otherwise the badge
          // flickers off on refresh and returns seconds later.
          setTimeout(() => fetchVipStatus(retryCount + 1), 1200);
          return;
        } else if (confirmedActiveRef.current) {
          // No row, but this session has already seen a live one. That is the
          // RLS/auth race described on confirmedActiveRef, not a cancellation.
          // Keep what we know and come back for it rather than revoking — a
          // real downgrade arrives as a row with a past expires_at, which is
          // handled above and still takes effect immediately.
          setTimeout(() => fetchVipStatus(0), 5000);
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

    // Admins keep lifetime PRO, healed on login if the row is ever removed or
    // shortened. The admin check now happens inside the function rather than
    // out here: the subscription table is no longer client-writable, because
    // "a user may write their own row" also meant a user could write
    // themselves any tier and any expiry date they liked.
    const ensureAdminLifetimePro = async () => {
      const { data: existing } = await supabase
        .from("vip_subscriptions")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing && isLifetime(existing.expires_at)) return;

      const { data: granted, error } = await supabase.rpc("ensure_admin_lifetime_pro");
      if (error) {
        console.error("[VipContext] Admin lifetime PRO self-grant failed:", error);
        return;
      }
      // Returns false for everyone who isn't an admin, which is the common case.
      if (granted) fetchVipStatus();
    };

    fetchVipStatusRef.current = () => { fetchVipStatus(); };

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

    return () => {
      fetchVipStatusRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [user]);

  /**
   * Re-read the subscription row.
   *
   * Replaces `activateVip`, which called `grant_vip_days` directly. That
   * function took a duration and nothing else, was granted to `authenticated`,
   * and stacked — so the shop's "spend gems, then activate" pair could be run
   * without the spending half, from the console, in a loop. It is revoked from
   * clients now (20261104110000) and VIP time is bought through
   * `purchase_shop_item`, which debits and grants in one transaction.
   *
   * What is left for this context to do afterwards is notice. The realtime
   * subscription on `vip_subscriptions` above usually gets there first; this
   * is for the caller that wants the new state before it draws.
   */
  const refresh = (): void => {
    fetchVipStatusRef.current?.();
  };

  /**
   * See the note on the interface. Draws PRO immediately, then reconciles.
   *
   * The reconciling fetch is still fired: this is a head start on the server,
   * not a replacement for it. If verify-receipt never writes the row, the
   * fetch finds nothing and PRO goes back off — which is the honest outcome
   * and is still faster than showing a locked app to somebody who has just
   * been charged.
   */
  const applyEntitlement = (tier: string, expiresAt: string): void => {
    setSubscription((previous) =>
      ({ ...(previous ?? {}), vip_tier: tier, expires_at: expiresAt }) as VipSubscription,
    );
    setIsVip(true);
    // Outrank the database until it catches up — see optimisticUntilRef.
    optimisticUntilRef.current = Date.now() + 30_000;
    try {
      localStorage.setItem(VIP_CACHE_KEY, "true");
    } catch {
      // Private mode, cleared site data. The state above is what matters.
    }
    fetchVipStatusRef.current?.();
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

  const getTierBenefits = () => {
    if (!subscription?.vip_tier) return VIP_BENEFITS_BY_TIER.pro;
    return VIP_BENEFITS_BY_TIER[subscription.vip_tier as keyof typeof VIP_BENEFITS_BY_TIER] || VIP_BENEFITS_BY_TIER.pro;
  };

  const isProPlus = (): boolean => subscription?.vip_tier === 'pro_plus';
  const getDailyRewardMultiplier = (): number => isProPlus() ? 1.5 : 1;

  const value: VipContextType = useMemo(
    () => ({
      subscription,
      isVip,
      loading,
      refresh,
      applyEntitlement,
      getDaysRemaining,
      getXpMultiplier,
      getMaxDailySpins,
      benefits: VIP_BENEFITS,
      tierBenefits: getTierBenefits(),
      isProPlus,
      getDailyRewardMultiplier,
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
