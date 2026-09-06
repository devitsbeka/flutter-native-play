import { useCallback, useState } from "react";
import confetti from "canvas-confetti";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { toast } from "@/hooks/use-toast";
import { useDailyRewardsClaim, useRewardTimers } from "@/hooks/useRewardTimers";

/**
 * Claim today's daily reward where the player tapped, with no screen in
 * between.
 *
 * The rewards sheet is where the week is read — which day pays what, what
 * the streak is worth. It is not a step on the way to today's reward: the
 * gift tab on the home screen already says "claim", and making that tap open
 * a carousel with a second claim button in it asks the player to say yes
 * twice to a thing they cannot decline.
 *
 * So the tab claims, and the celebration comes to the tab: a haptic, the
 * reward sound, confetti and a receipt naming what the server actually
 * awarded. The balances and the tab's own countdown refresh behind it.
 */
export function useQuickDailyClaim() {
  const { user, fetchProfile } = useAuth();
  const { t } = useLanguage();
  const { playSound, vibrate } = useSound();
  const { canClaimDaily, refreshTimers } = useRewardTimers();
  const { claimDailyReward } = useDailyRewardsClaim();
  const [claiming, setClaiming] = useState(false);

  const claimNow = useCallback(async (): Promise<boolean> => {
    // A tap while the last one is still in flight would claim twice — the
    // server refuses the second, but the player sees a failure for a reward
    // they just got.
    if (!user || !canClaimDaily || claiming) return false;
    setClaiming(true);
    vibrate([50, 30, 50]);

    const claim = await claimDailyReward();
    setClaiming(false);

    if (!claim) {
      toast({ title: t("common.error"), description: t("extra.genericError"), variant: "destructive" });
      return false;
    }

    playSound("reward");
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.55 },
      colors: ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1"],
      zIndex: 9999,
    });

    // What the server granted, not a guess at it.
    const parts: string[] = [];
    if (claim.coins > 0) parts.push(`+${claim.coins.toLocaleString()} ${t("common.coins")}`);
    if (claim.gems > 0) parts.push(`+${claim.gems.toLocaleString()} ${t("common.gems")}`);
    if (claim.powerUp && claim.powerUpCount > 0) {
      parts.push(`+${claim.powerUpCount} ${t("dailyRewards.powerUp")}`);
    }
    toast({ title: t("dailyRewards.congratulations"), description: parts.join(" · ") });

    // The balances live on the profile, and the tab's label reads the
    // timers — both are stale the moment the claim lands.
    await fetchProfile(user.id);
    refreshTimers();
    return true;
  }, [user, canClaimDaily, claiming, vibrate, claimDailyReward, playSound, t, fetchProfile, refreshTimers]);

  return { canClaimDaily, claiming, claimNow };
}
