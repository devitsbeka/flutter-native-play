/**
 * Auto-grant VIP benefits on login/app open
 * Handles daily power-ups claim for VIP users
 */

import { toastIcon } from "@/lib/toast-icons";
import crownIcon from "@/assets/icons/crown-3d.png";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useDailyVipRewards } from "@/hooks/useDailyVipRewards";
import { toast } from "sonner";
import { t as tStandalone } from "@/contexts/LanguageContext";

export function useVipBenefitsAutoGrant() {
  const { user } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();
  const { canClaimPowerUps, claimDailyPowerUps, loading: rewardsLoading } = useDailyVipRewards();
  const hasAttemptedClaim = useRef(false);

  useEffect(() => {
    // Reset claim attempt when user changes
    if (!user) {
      hasAttemptedClaim.current = false;
      return;
    }

    // Wait for all loading to complete
    if (vipLoading || rewardsLoading) return;

    // Only attempt once per session
    if (hasAttemptedClaim.current) return;

    // Only for VIP users who can claim
    if (!isVip || !canClaimPowerUps) return;

    hasAttemptedClaim.current = true;

    // Auto-claim with toast notification
    const autoClaim = async () => {
      const success = await claimDailyPowerUps();
      if (success) {
        toast.success(tStandalone("extra.vipFourPowersGranted"), {
          icon: toastIcon(crownIcon),
          duration: 3000,
        });
      }
    };

    // Small delay to not interfere with initial app load
    const timer = setTimeout(autoClaim, 1500);
    return () => clearTimeout(timer);
  }, [user, isVip, vipLoading, rewardsLoading, canClaimPowerUps, claimDailyPowerUps]);
}
