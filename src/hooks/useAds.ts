import { useCallback, useEffect } from "react";
import { adService } from "@/services/adService";
import { useVipStatus } from "@/hooks/useVipStatus";

// Interstitial cadence: first after >=5 completed games, then every 3 games,
// never more often than every 3 minutes. PRO/VIP users and web browsers see nothing.
const FIRST_INTERSTITIAL_AFTER_GAMES = 5;
const INTERSTITIAL_EVERY_N_GAMES = 3;
const INTERSTITIAL_MIN_INTERVAL_MS = 3 * 60 * 1000;
const COUNT_KEY = "ad_interstitial_count";
const LAST_TS_KEY = "ad_interstitial_last_ts";

const readInt = (key: string): number => {
  try {
    const v = parseInt(localStorage.getItem(key) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
};

const writeInt = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // storage unavailable — cadence degrades gracefully
  }
};

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
   * Call once per completed game with (profile.games_played || 0) + 1.
   * Shows an interstitial when the cadence allows; returns whether one was shown.
   */
  const maybeShowInterstitial = useCallback(
    async (gamesPlayedAfterThisGame: number): Promise<boolean> => {
      if (isVip) return false;
      if (!adService.isRunningOnNative()) return false; // web browser = no gates
      if (gamesPlayedAfterThisGame < FIRST_INTERSTITIAL_AFTER_GAMES) return false;

      const lastShownTs = readInt(LAST_TS_KEY);
      const gamesSinceLast = readInt(COUNT_KEY) + 1;
      writeInt(COUNT_KEY, gamesSinceLast);

      if (lastShownTs > 0) {
        if (gamesSinceLast < INTERSTITIAL_EVERY_N_GAMES) return false;
        if (Date.now() - lastShownTs < INTERSTITIAL_MIN_INTERVAL_MS) return false;
      }

      const shown = await adService.showInterstitial();
      if (shown) {
        writeInt(COUNT_KEY, 0);
        writeInt(LAST_TS_KEY, Date.now());
        // Preload the next one in the background
        void adService.prepareInterstitial();
      }
      return shown;
    },
    [isVip]
  );

  /**
   * Rewarded-ad gate: PRO/VIP and web users pass straight through; everyone
   * else watches a rewarded ad first. Ad failures retry once, then fail open —
   * onProceed always runs exactly once.
   */
  const gateWithRewardedAd = useCallback(
    async (onProceed: () => void | Promise<void>): Promise<void> => {
      if (isVip || !adService.isRunningOnNative()) {
        await onProceed();
        return;
      }

      let dismissed = false;
      const callbacks = {
        onAdDismissed: () => {
          dismissed = true;
        },
      };

      const succeeded = await adService.showRewardedAdWithPreload(callbacks);
      if (!succeeded && !dismissed) {
        // Genuine ad failure (not a user dismissal) — retry once, then fail open
        await adService.showRewardedAdWithPreload(callbacks);
      }
      await onProceed();
    },
    [isVip]
  );

  return {
    isVip,
    vipLoading,
    maybeShowInterstitial,
    gateWithRewardedAd,
  };
}
