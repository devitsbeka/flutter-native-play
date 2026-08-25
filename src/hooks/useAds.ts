import { useCallback, useEffect } from "react";
import { adService } from "@/services/adService";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useAuth } from "@/hooks/useAuth";

// Ads are strictly opt-in. An ad plays only when the player pressed a button
// that says so — extra plays after the free games, bonus spins, power-ups.
// There are no interstitials and no ad gates on ordinary actions; anything
// that reintroduces an unsolicited ad is a product regression, not a tweak.

export function useAds() {
  const { isVip, loading: vipLoading } = useVipStatus();
  const { profile } = useAuth();
  const ageGroup = (profile as { age_group?: string | null } | null)?.age_group ?? null;

  // Age before initialize, not after.
  //
  // `tagForUnderAgeOfConsent` and `maxAdContentRating` are arguments to
  // AdMob.initialize() and are read once per process. This effect used to be
  // a bare `adService.initialize()`, so the SDK was always configured with no
  // age treatment at all and the two ad modals' later `setAgeGroup` calls
  // could only affect the per-request `npa` flag — an under-18 player was
  // kept off personalised ads and could still be shown adult-rated ones.
  //
  // Setting it first covers the signed-in case; adService re-applies on its
  // own if the profile arrives after initialization, which is the ordinary
  // case for a player who signs in mid-session.
  useEffect(() => {
    adService.setAgeGroup(ageGroup);
    adService.initialize();
  }, [ageGroup]);

  // Keep the service's VIP bypass in sync with the live VIP status
  useEffect(() => {
    if (!vipLoading) adService.setVipStatus(isVip);
  }, [isVip, vipLoading]);

  /**
   * Rewarded-ad gate: PRO/VIP and web users pass straight through; everyone
   * else watches a rewarded ad first. Ad failures retry once, then fail open —
   * onProceed always runs exactly once.
   *
   * The AdMob plugin's load/show promises can hang forever (no-fill without a
   * FailedToLoad event, listener mismatch after a plugin update). The gate must
   * never trap the user behind an infinite spinner, so it fails open when the
   * ad hasn't actually SHOWN within a short deadline; once an ad is visibly
   * playing it gets ample time to finish.
   */
  const gateWithRewardedAd = useCallback(
    async (onProceed: () => void | Promise<void>): Promise<void> => {
      if (isVip || !adService.isRunningOnNative()) {
        await onProceed();
        return;
      }

      let dismissed = false;
      let adShowed = false;
      const callbacks = {
        onAdShowed: () => {
          adShowed = true;
        },
        onAdDismissed: () => {
          dismissed = true;
        },
      };

      const runGate = async () => {
        const succeeded = await adService.showRewardedAdWithPreload(callbacks);
        if (!succeeded && !dismissed) {
          // Genuine ad failure (not a user dismissal) — retry once, then fail open
          await adService.showRewardedAdWithPreload(callbacks);
        }
      };

      const AD_LOAD_DEADLINE_MS = 12_000; // ad never appeared — give up and proceed
      const AD_WATCH_DEADLINE_MS = 120_000; // ad is on screen — allow a full watch

      await new Promise<void>((resolve) => {
        let settled = false;
        const settle = () => {
          if (!settled) {
            settled = true;
            clearInterval(watchdog);
            resolve();
          }
        };

        const startedAt = Date.now();
        const watchdog = setInterval(() => {
          const limit = adShowed ? AD_WATCH_DEADLINE_MS : AD_LOAD_DEADLINE_MS;
          if (Date.now() - startedAt > limit) {
            console.warn(`[Ads] Rewarded gate timed out after ${limit}ms (adShowed=${adShowed}) — failing open`);
            settle();
          }
        }, 500);

        runGate()
          .catch((error) => console.error("[Ads] Rewarded gate error — failing open:", error))
          .finally(settle);
      });

      await onProceed();
    },
    [isVip]
  );

  return {
    isVip,
    vipLoading,
    gateWithRewardedAd,
  };
}
