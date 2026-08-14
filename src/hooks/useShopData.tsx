import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AVATAR_FRAMES } from "@/hooks/useAvatarFrames";
import { VipDuration } from "@/hooks/useVipStatus";
import { PowerUpType } from "@/hooks/useUserPowerUps";

import fiftyFiftyIcon from "@/assets/powers/5050.webp";
import freezeIcon from "@/assets/powers/freeze.webp";
import replaceIcon from "@/assets/powers/replace.webp";
import timeDrainIcon from "@/assets/powers/time-drain.webp";
import coinIcon from "@/assets/icons/icon-coin.webp";
import gemIcon from "@/assets/icons/icon-gem.webp";
import { GEM_PACKS } from "@/config/gemPacks";
import iconStarterPack from "@/assets/icons/icon-starter-pack.webp";
import iconVipCrown from "@/assets/icons/icon-vip-crown.webp";
import iconMagicOrb from "@/assets/icons/magic-orb.webp";
import iconMagicForge from "@/assets/icons/magic-forge.webp";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "gems" | "coins" | "lari";
  icon: React.ReactNode;
  gradient: string;
  badge?: "popular" | "best-value" | "limited" | "new" | null;
  savings?: number;
  /** Render the card filled with its gradient (hero bundles) instead of the
      neutral lavender-white surface. */
  vibrant?: boolean;
  vipDuration?: VipDuration;
  powerType?: PowerUpType;
  amount?: number;
  value?: number;
  frameId?: string;
  bonusPercentage?: number;
}

export interface ShopSection {
  id: string;
  title: string;
  description: string;
  videoSrc: string;
  items: ShopItem[];
}

// Helper function to get frame data by ID
const getFrameById = (frameId: string) => AVATAR_FRAMES.find(f => f.id === frameId);

// Simple frame preview icon that doesn't use hooks
const FramePreviewIcon = ({ frameId }: { frameId: string }) => {
  const frame = getFrameById(frameId);
  if (!frame) return <div className="w-12 h-12 rounded-full bg-muted" />;
  
  return (
    <div 
      className={`w-12 h-12 rounded-full bg-gradient-to-br ${frame.gradient} ${frame.borderStyle} flex items-center justify-center text-lg`}
    >
      👤
    </div>
  );
};

export function useShopData() {
  const { t } = useLanguage();

  return useMemo(() => {
    // ECONOMY CONSTANTS (from rewardConfig)
    // 1 GEL = 10 gems, 1 gem = 500 coins
    // VIP: day=30, week=100, month=250 gems
    
    // Hot Deals - Starter Pack Section
    // Value calculation: 1 power-up ≈ 1 gem (based on 500 coin game stake)
    // 2x all powers = 8 power-ups = ~8 gems value
    const STARTER_PACK_ITEMS: ShopItem[] = [
      {
        id: "starter_bundle",
        name: t("shop.starterPack"),
        description: `2x ${t("shop.allPowers")} + 500 ${t("shop.coin")}`,
        price: 10,  // 8 powers + 1 gem worth of coins = 9, sell for 10 (slight premium for convenience)
        currency: "gems",
        icon: <img src={iconStarterPack} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        badge: "new",
      },
      {
        id: "starter_bundle_medium",
        name: t("shop.mediumPackage"),
        description: `5x ${t("shop.allPowers")} + 1000 ${t("shop.coin")}`,
        price: 20,  // 20 powers (20 gems) + 2 gems coins = 22, sell for 20 = 9% discount
        currency: "gems",
        icon: <img src={iconStarterPack} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        badge: "popular",
        savings: 10,
      },
      {
        id: "starter_bundle_large",
        name: t("shop.largePackage"),
        description: `10x ${t("shop.allPowers")} + 2500 ${t("shop.coin")}`,
        price: 35,  // 40 powers (40 gems) + 5 gems coins = 45, sell for 35 = 22% discount
        currency: "gems",
        icon: <img src={iconStarterPack} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        badge: "best-value",
        savings: 22,
      },
    ];

    // Hot Deals - Mega Powers Section (powers only, no coins)
    const MEGA_POWERS_ITEMS: ShopItem[] = [
      {
        id: "power_bundle_small",
        name: t("shop.powerPackOrb"),
        description: `2x ${t("shop.allPowers")}`,
        price: 7,  // 8 powers worth 8 gems, sell for 7 = 12% discount
        currency: "gems",
        icon: <img src={iconMagicOrb} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        savings: 12,
      },
      {
        id: "power_bundle_large",
        name: t("shop.powerPackForge"),
        description: `10x ${t("shop.allPowers")}`,
        price: 28,  // 40 powers worth 40 gems, sell for 28 = 30% discount
        currency: "gems",
        icon: <img src={iconMagicForge} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        savings: 30,
      },
    ];

    // VIP Section - aligned with rewardConfig.ts VIP_PRICES
    // (no 1-day option — week and month keep the section an even pair)
    const VIP_PROMO_ITEMS: ShopItem[] = [
      {
        id: "vip_week_deal",
        name: t("shop.vipWeek"),
        description: t("shop.vipBenefitsWeek"),
        price: 100,  // 100 gems = 10 GEL (vs 210 for 7 days = 52% savings)
        currency: "gems",
        icon: <img src={iconVipCrown} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        badge: "popular",
        savings: 52,
        vipDuration: "week",
      },
      {
        id: "vip_month",
        name: t("shop.vipMonth"),
        description: t("shop.vipBenefitsMonth"),
        price: 250,  // 250 gems = 25 GEL (vs 900 for 30 days = 72% savings)
        currency: "gems",
        icon: <img src={iconVipCrown} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        badge: "best-value",
        savings: 72,
        vipDuration: "month",
      },
    ];

    // Powers Section - Individual power-ups
    // Base: 1 power = 1 gem (equivalent to 500 coins game stake)
    const POWERS_ITEMS: ShopItem[] = [
      {
        id: "power_5050_3",
        name: `${t("powerups.fiftyFifty.name")} ×3`,
        description: t("shop.deletesWrongAnswers"),
        price: 3,  // 3 gems for 3 powers = 1 gem each (no discount for small qty)
        currency: "gems",
        icon: <img src={fiftyFiftyIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: "linear-gradient(135deg, hsl(350 80% 60%) 0%, hsl(330 75% 55%) 100%)",
        powerType: "5050",
        amount: 3,
      },
      {
        id: "power_freeze_3",
        name: `${t("powerups.freeze.name")} ×3`,
        description: t("shop.freezesTime"),
        price: 3,
        currency: "gems",
        icon: <img src={freezeIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: "linear-gradient(135deg, hsl(190 90% 55%) 0%, hsl(210 80% 55%) 100%)",
        powerType: "freeze",
        amount: 3,
      },
      {
        id: "power_replace_3",
        name: `${t("powerups.replace.name")} ×3`,
        description: t("shop.replacesQuestion"),
        price: 3,
        currency: "gems",
        icon: <img src={replaceIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: "linear-gradient(135deg, hsl(150 75% 50%) 0%, hsl(140 70% 45%) 100%)",
        powerType: "replace",
        amount: 3,
      },
      {
        id: "power_timedrain_3",
        name: `${t("powerups.timeDrain.name")} ×3`,
        description: t("shop.addsTime"),
        price: 3,
        currency: "gems",
        icon: <img src={timeDrainIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: "linear-gradient(135deg, hsl(270 70% 60%) 0%, hsl(280 65% 55%) 100%)",
        powerType: "time-drain",
        amount: 3,
      },
    ];

    // Frames Section - generated from AVATAR_FRAMES
    const FRAMES_ITEMS: ShopItem[] = AVATAR_FRAMES.slice(0, 4).map((frame, index) => ({
      id: `frame_${frame.id}`,
      name: frame.name,
      description: frame.description,
      price: frame.price,
      currency: "gems" as const,
      icon: <FramePreviewIcon frameId={frame.id} />,
      gradient: "transparent",
      frameId: frame.id,
      badge: index === 0 ? "new" as const : index === 1 ? "popular" as const : frame.rarity === "legendary" ? "best-value" as const : null,
    }));

    // Coins Section - 1 gem = 500 coins base rate
    const COINS_ITEMS: ShopItem[] = [
      {
        id: "coins_500",
        name: `500 ${t("shop.coin")}`,
        description: t("shop.coinsDescSmall"),
        price: 1,  // Exact rate: 500 coins = 1 gem
        currency: "gems",
        icon: <img src={coinIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: "linear-gradient(135deg, hsl(45 90% 60%) 0%, hsl(40 85% 50%) 100%)",
        value: 500,
      },
      {
        id: "coins_1500",
        name: `1500 ${t("shop.coin")}`,
        description: t("shop.coinsDescMedium"),
        price: 3,  // 1500 coins = 3 gems (exact rate)
        currency: "gems",
        icon: <img src={coinIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: "linear-gradient(135deg, hsl(40 90% 55%) 0%, hsl(35 85% 48%) 100%)",
        value: 1500,
      },
      {
        id: "coins_5000",
        name: `5000 ${t("shop.coin")}`,
        description: t("shop.coinsDescLarge"),
        price: 9,  // 5000 coins = 10 gems, sell for 9 = 10% bonus
        currency: "gems",
        icon: <img src={coinIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: "linear-gradient(135deg, hsl(35 90% 52%) 0%, hsl(25 85% 45%) 100%)",
        value: 5000,
        badge: "popular",
        savings: 10,
      },
      {
        id: "coins_15000",
        name: `15000 ${t("shop.coin")}`,
        description: t("shop.coinsDescMega"),
        price: 24,  // 15000 coins = 30 gems, sell for 24 = 20% bonus
        currency: "gems",
        icon: <img src={coinIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: "linear-gradient(135deg, hsl(25 90% 50%) 0%, hsl(15 85% 45%) 100%)",
        value: 15000,
        badge: "best-value",
        savings: 20,
      },
    ];

    // Gems Section (real money). Built from GEM_PACKS so the shop grid, the
    // "not enough gems" modal, the Stripe checkout and the App Store catalog
    // all sell the same four packs. They did not: this list and the modal's
    // carried different ladders, and only this one matched the economy the
    // rest of the shop is priced against ("1 GEL = 10 gems", above).
    //
    // `value` is the total credited, bonus included. It used to be the base
    // figure while the card advertised "+200", so the bonus was promised on
    // every pack and granted on none.
    const GEMS_GRADIENTS = [
      "linear-gradient(135deg, hsl(270 80% 60%) 0%, hsl(290 75% 55%) 100%)",
      "linear-gradient(135deg, hsl(275 80% 58%) 0%, hsl(295 75% 52%) 100%)",
      "linear-gradient(135deg, hsl(280 82% 55%) 0%, hsl(300 78% 50%) 100%)",
      "linear-gradient(135deg, hsl(285 85% 52%) 0%, hsl(310 80% 48%) 100%)",
    ];
    const GEMS_DESCRIPTIONS = [
      "shop.gemsDescSmall",
      "shop.gemsDescMedium",
      "shop.gemsDescLarge",
      "shop.gemsDescMega",
    ];
    const GEMS_BADGES: (ShopItem["badge"] | undefined)[] = [
      undefined,
      "popular",
      undefined,
      "best-value",
    ];

    const GEMS_ITEMS: ShopItem[] = GEM_PACKS.map((pack, i) => ({
      id: pack.id,
      name: pack.name,
      description: t(GEMS_DESCRIPTIONS[i] ?? "shop.gemsDescSmall"),
      price: pack.priceUsd,
      currency: "lari",
      icon: <img src={gemIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
      gradient: GEMS_GRADIENTS[i] ?? GEMS_GRADIENTS[0],
      value: pack.gems,
      badge: GEMS_BADGES[i],
      savings: pack.bonus,
      bonusPercentage: pack.bonus,
    }));

    // Section definitions - ordered: ჩემი ძალები (hardcoded) → მონეტები → ალმასები → VIP → მოიმატე ძალები → სუპერ ძალები
    const SHOP_SECTIONS: ShopSection[] = [
      {
        id: "coins",
        title: t("shop.coins"),
        description: t("shop.withBonuses"),
        videoSrc: "/videos/coins.mp4",
        items: COINS_ITEMS,
      },
      {
        id: "gems-lari",
        title: t("common.gems"),
        description: "$ Buy with USD",
        videoSrc: "/videos/gems.mp4",
        items: GEMS_ITEMS,
      },
      {
        id: "vip",
        title: t("shop.vipStatus"),
        description: t("shop.vipBenefits"),
        videoSrc: "/videos/vip.mp4",
        items: VIP_PROMO_ITEMS,
      },
      {
        id: "powers",
        title: t("shop.powers"),
        description: t("shop.advantage"),
        videoSrc: "/videos/powers.mp4",
        items: POWERS_ITEMS,
      },
      {
        id: "mega-powers",
        title: t("shop.megaPowers"),
        description: t("shop.winMoreGames"),
        videoSrc: "/videos/mega-powers-2.mp4",
        items: MEGA_POWERS_ITEMS,
      },
      {
        id: "frames",
        title: t("shop.frames"),
        description: t("shop.uniqueProfile"),
        videoSrc: "/videos/art.mp4",
        items: FRAMES_ITEMS,
      },
    ];

    return { SHOP_SECTIONS };
  }, [t]);
}
