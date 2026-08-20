import { useCallback, useEffect } from "react";
import { adService } from "@/services/adService";
import { useVipStatus } from "@/hooks/useVipStatus";

// Ads are strictly opt-in. An ad plays only when the player pressed a button
// that says so — extra plays after the free games, bonus spins, power-ups.
// There are no interstitials and no ad gates on ordinary actions; anything
// that reintroduces an unsolicited ad is a product regression, not a tweak.

export function useAds() {
  const { isVip, loading: vipLoading } = useVipStatus();

  useEffect(() => {
    adService.initialize();
  }, []);

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
