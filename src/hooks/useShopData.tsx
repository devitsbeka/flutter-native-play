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
import { REWARDS } from "@/config/rewardConfig";
import {
  COIN_PACKS,
  GEMS_PER_POWER_LIST,
  POWER_BUNDLES,
  POWER_TYPE_COUNT,
  COINS_PER_GEM_LIST,
  STARTER_BUNDLES,
} from "@/config/shopValue";
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
    // 1 gem = 500 coins. VIP prices come from REWARDS.VIP_PRICES below rather
    // than being written out here — they are set against the SUBSCRIPTION
    // price and moved when the lari rate was unified, and a second copy in a
    // comment is how the last set went stale.
    //
    // The "1 GEL = 10 gems" anchor that used to be stated here was never true
    // of the shipped ladder: the packs sat about 5x away from it, and quoting
    // it made every value calculation below read as more grounded than it was.
    
    // Hot Deals - Starter Pack Section
    //
    // Priced like the rotating deals: declare a discount, and let
    // src/config/shopValue.ts work out both the reference and the price from
    // the contents. These three are the reason that module exists.
    //
    // They were 10 / 20 / 35 gems against contents that the SAME shop
    // assembled for 8 / 21 / 33 from the Mega Powers and Coins sections two
    // rows down — so the "starter pack" cost 25% more than its own parts, and
    // two of the three wore a discount badge while doing it. The hand-written
    // arithmetic in the old comments was not wrong, it was measured against
    // the 1-gem-per-power list rate and simply did not know the shop undercut
    // itself.
    const STARTER_PACK_ART: Record<string, { nameKey: string; badge: ShopItem["badge"] }> = {
      starter_bundle: { nameKey: "shop.starterPack", badge: "new" },
      starter_bundle_medium: { nameKey: "shop.mediumPackage", badge: "popular" },
      starter_bundle_large: { nameKey: "shop.largePackage", badge: "best-value" },
    };

    const STARTER_PACK_ITEMS: ShopItem[] = STARTER_BUNDLES.map((bundle) => {
      const art = STARTER_PACK_ART[bundle.id];
      return {
        id: bundle.id,
        name: t(art.nameKey),
        description: `${bundle.contents.powers}x ${t("shop.allPowers")} + ${bundle.contents.coins} ${t("shop.coin")}`,
        price: bundle.price,
        currency: "gems" as const,
        icon: <img src={iconStarterPack} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        badge: art.badge,
        savings: bundle.savings,
      };
    });

    // Hot Deals - Mega Powers Section (powers only, no coins)
    //
    // Built from POWER_BUNDLES in src/config/shopValue.ts, which is also what
    // every other bundle's reference price is computed against — so a price
    // cannot be changed here without moving the number the starter packs and
    // the rotating deals are measured by. That is the drift these two rows
    // caused: they undercut the list rate the starter packs were priced
    // against, and nothing connected the two.
    //
    // The savings are derived rather than stated. They came to 12% and 30%
    // against the 1-gem-per-power list rate, which is what the hand-written
    // figures said, and those were right — unlike the starter packs'.
    const MEGA_POWERS_ART: Record<string, { nameKey: string; icon: string }> = {
      power_bundle_small: { nameKey: "shop.powerPackOrb", icon: iconMagicOrb },
      power_bundle_large: { nameKey: "shop.powerPackForge", icon: iconMagicForge },
    };

    const MEGA_POWERS_ITEMS: ShopItem[] = POWER_BUNDLES.map((bundle) => {
      const art = MEGA_POWERS_ART[bundle.id];
      const listValue = bundle.powers * POWER_TYPE_COUNT * GEMS_PER_POWER_LIST;
      return {
        id: bundle.id,
        name: t(art.nameKey),
        description: `${bundle.powers}x ${t("shop.allPowers")}`,
        price: bundle.gems,
        currency: "gems" as const,
        icon: <img src={art.icon} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        savings: Math.round((1 - bundle.gems / listValue) * 100),
      };
    });

    // VIP Section - priced FROM rewardConfig.ts VIP_PRICES rather than
    // repeating the numbers, because these are set against the subscription
    // price (see the note there) and a hardcoded copy here would have to move
    // with it. It did not, twice.
    //
    // (no 1-day option — week and month keep the section an even pair)
    //
    // Neither row carries a `savings` percentage any more, and that is the
    // point. They used to: -52% on the week and -72% on the month, both
    // measured against a 1-day VIP price times the number of days. This shop
    // has never listed a 1-day VIP, so the discount was against a figure with
    // no purchasable original — exactly the reference-price claim guideline
    // 2.3.1 calls out.
    //
    // The two honest fixes were to list a 1-day VIP and let the comparison
    // stand, or to drop the badge. Dropping it, because a 1-day VIP is not an
    // offer anyone here wants to make — it would exist only to be the
    // expensive thing the real items are cheaper than, and the section is
    // deliberately an even pair.
    //
    // Note the home screen's GemShopModal DOES sell a 1-day VIP, from the same
    // VIP_PRICES table. So the comparison could be honestly made there. It
    // still is not, for the same reason.
    const VIP_PROMO_ITEMS: ShopItem[] = [
      {
        id: "vip_week_deal",
        name: t("shop.vipWeek"),
        description: t("shop.vipBenefitsWeek"),
        price: REWARDS.VIP_PRICES.week,
        currency: "gems",
        icon: <img src={iconVipCrown} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        badge: "popular",
        vipDuration: "week",
      },
      {
        id: "vip_month",
        name: t("shop.vipMonth"),
        description: t("shop.vipBenefitsMonth"),
        price: REWARDS.VIP_PRICES.month,
        currency: "gems",
        icon: <img src={iconVipCrown} alt="" width={50} height={50} loading="lazy" decoding="async" className="w-[50px] h-[50px] object-contain" />,
        gradient: "transparent",
        badge: "best-value",
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

    // Coins Section
    //
    // Built from COIN_PACKS in src/config/shopValue.ts. The larger two pay a
    // bonus over the base 500-coins-per-gem rate, and the savings figure is
    // derived from that rather than stated, so a pack cannot advertise a bonus
    // it does not pay.
    //
    // That bonus is only safe because the coins→gems exchange now charges a
    // spread. It did not: `exchange_currency` bought and sold at a flat 500,
    // so 24 gems bought 15 000 coins which sold back for 30, and the two
    // halves of that loop were both in the shipped UI. See the migration
    // 20261104110000_shop_purchase_and_exchange_spread.sql.
    const COINS_ART: Record<string, { descriptionKey: string; gradient: string; badge?: ShopItem["badge"] }> = {
      coins_500: { descriptionKey: "shop.coinsDescSmall", gradient: "linear-gradient(135deg, hsl(45 90% 60%) 0%, hsl(40 85% 50%) 100%)" },
      coins_1500: { descriptionKey: "shop.coinsDescMedium", gradient: "linear-gradient(135deg, hsl(40 90% 55%) 0%, hsl(35 85% 48%) 100%)" },
      coins_5000: { descriptionKey: "shop.coinsDescLarge", gradient: "linear-gradient(135deg, hsl(35 90% 52%) 0%, hsl(25 85% 45%) 100%)", badge: "popular" },
      coins_15000: { descriptionKey: "shop.coinsDescMega", gradient: "linear-gradient(135deg, hsl(25 90% 50%) 0%, hsl(15 85% 45%) 100%)", badge: "best-value" },
    };

    const COINS_ITEMS: ShopItem[] = COIN_PACKS.map((pack) => {
      const listPrice = pack.coins / COINS_PER_GEM_LIST;
      const savings = Math.round((1 - pack.gems / listPrice) * 100);
      const art = COINS_ART[pack.id];
      return {
        id: pack.id,
        name: `${pack.coins} ${t("shop.coin")}`,
        description: t(art.descriptionKey),
        price: pack.gems,
        currency: "gems" as const,
        icon: <img src={coinIcon} alt="" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8" />,
        gradient: art.gradient,
        value: pack.coins,
        badge: art.badge,
        ...(savings > 0 ? { savings } : {}),
      };
    });

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
