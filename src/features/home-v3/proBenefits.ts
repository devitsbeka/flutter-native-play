import playIcon from "@/assets/icons/push-button-3d.png";
import inviteIcon from "@/assets/icons/group-of-people.png";
import noAdsIcon from "@/assets/icons/icon-ad-free.png";
import levelsIcon from "@/assets/icons/icon-map-3d.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import shopIcon from "@/assets/icons/icon-shop-3d.png";

/**
 * The six things PRO buys, in the paywall's own words (its `paywall.benefit*`
 * strings, already in every locale) and the app's own 3D icons, tinted into
 * the tile's blue like the reference's key and calendar.
 */
export const PRO_BENEFITS: Array<{ id: string; icon: string; titleKey: string; blurbKey: string }> = [
  { id: "play", icon: playIcon, titleKey: "paywall.benefitPlayTitle", blurbKey: "paywall.benefitPlayBlurb" },
  { id: "levels", icon: levelsIcon, titleKey: "paywall.benefitLevelsTitle", blurbKey: "paywall.benefitLevelsBlurb" },
  { id: "noAds", icon: noAdsIcon, titleKey: "paywall.benefitNoAdsTitle", blurbKey: "paywall.benefitNoAdsBlurb" },
  { id: "xp", icon: xpIcon, titleKey: "paywall.benefitXpTitle", blurbKey: "paywall.benefitXpBlurb" },
  { id: "invite", icon: inviteIcon, titleKey: "paywall.benefitInviteTitle", blurbKey: "paywall.benefitInviteBlurbOne" },
  { id: "shop", icon: shopIcon, titleKey: "paywall.benefitShopTitle", blurbKey: "paywall.benefitShopBlurb" },
];
