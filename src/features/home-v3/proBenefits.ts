import { useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInAppPurchases } from "@/hooks/useInAppPurchases";
import { availablePlans, defaultPlan, friendSeats } from "@/config/proPlans";

import playIcon from "@/assets/icons/push-button-3d.png";
import inviteIcon from "@/assets/icons/group-of-people.png";
import noAdsIcon from "@/assets/icons/icon-ad-free.png";
import levelsIcon from "@/assets/icons/icon-map-3d.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import shopIcon from "@/assets/icons/icon-shop-3d.png";

export interface ProBenefit {
  id: string;
  icon: string;
  title: string;
  blurb: string;
}

/**
 * The six things PRO buys, in the paywall's own order and words — the same
 * `paywall.benefit*` strings it renders, so the row here and the sheet it
 * opens can never disagree.
 *
 * The friends line is the one that varies: the monthly plan passes PRO to
 * one friend, the others to five. It is read off the plan the paywall would
 * open on — the featured row among what the store actually offers on this
 * platform — exactly as the paywall reads it, rather than stated once.
 */
export function useProBenefits(): ProBenefit[] {
  const { t } = useLanguage();
  const { products } = useInAppPurchases();

  return useMemo(() => {
    const plan = defaultPlan(availablePlans(products.map((p) => p.productId), Capacitor.isNativePlatform()));
    const seats = plan ? friendSeats(plan.tier) : 1;
    const inviteBlurb =
      seats === 1 ? t("paywall.benefitInviteBlurbOne") : t("paywall.benefitInviteBlurb").replace("{count}", String(seats));

    return [
      { id: "play", icon: playIcon, title: t("paywall.benefitPlayTitle"), blurb: t("paywall.benefitPlayBlurb") },
      { id: "invite", icon: inviteIcon, title: t("paywall.benefitInviteTitle"), blurb: inviteBlurb },
      { id: "noAds", icon: noAdsIcon, title: t("paywall.benefitNoAdsTitle"), blurb: t("paywall.benefitNoAdsBlurb") },
      { id: "levels", icon: levelsIcon, title: t("paywall.benefitLevelsTitle"), blurb: t("paywall.benefitLevelsBlurb") },
      { id: "xp", icon: xpIcon, title: t("paywall.benefitXpTitle"), blurb: t("paywall.benefitXpBlurb") },
      { id: "shop", icon: shopIcon, title: t("paywall.benefitShopTitle"), blurb: t("paywall.benefitShopBlurb") },
    ];
  }, [products, t]);
}
