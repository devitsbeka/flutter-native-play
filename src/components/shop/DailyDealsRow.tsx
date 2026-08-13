import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopItem } from "@/hooks/useShopData";
import { DAILY_DEALS, HOURLY_DEALS, ShopDeal, dealSavings } from "@/config/shopDeals";

import gemIcon from "@/assets/icons/icon-gem.webp";
import bannerCoinIcon from "@/assets/icons/icon-coin.png";
import bannerCrownIcon from "@/assets/crown-icon.png";
import bannerPowersIcon from "@/assets/icons/icon-powers-bottle.png";
import bannerDiscountIcon from "@/assets/pro-banner/banner-discount.webp";
import bannerTimerIcon from "@/assets/pro-banner/banner-timer.webp";
import { DealBanner, SKIN_WHITE } from "./ProBannerCard";
import powersIcon from "@/assets/icons/icon-powers-bottle.webp";

// Affordability isn't checked here on purpose — the page-level purchase
// handler already routes an underfunded tap to the NotEnoughGems modal.
const pad = (n: number) => String(n).padStart(2, "0");

export function formatRemaining(ms: number, withHours: boolean): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return withHours ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Converts a deal into a ShopItem so the page's existing purchase pipeline
// (spendGems → bundle grant via BUNDLE_CONTENTS) handles it unchanged.
export function dealToShopItem(deal: ShopDeal, name: string): ShopItem {
  return {
    id: deal.id,
    name,
    description: "",
    price: deal.price,
    currency: "gems",
    icon: <img src={powersIcon} alt="" className="w-8 h-8 object-contain" />,
    gradient: "transparent",
  };
}

interface DealCardProps {
  deal: ShopDeal;
  label: string;
  remainingLabel: string;
  gradient: string;
  chipClass: string;
  urgent?: boolean;
  isPurchased: boolean;
  isLoading: boolean;
  onBuy: () => void;
}

// Same offer for everyone at the same moment: index derives from wall time.
// Shared by the deals grid (md+) and the phone banner reel.
export function useLiveDeals() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const dailyDeal = DAILY_DEALS[Math.floor(now / 86_400_000) % DAILY_DEALS.length];
  const hourlyDeal = HOURLY_DEALS[Math.floor(now / 3_600_000) % HOURLY_DEALS.length];

  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const nextHour = (Math.floor(now / 3_600_000) + 1) * 3_600_000;

  return {
    dailyDeal,
    hourlyDeal,
    dailyRemaining: formatRemaining(nextMidnight.getTime() - now, true),
    hourlyRemaining: formatRemaining(nextHour - now, false),
  };
}

/**
 * A deal rendered as the offer banner — the one design, used by the phone
 * reel and the md+ deals grid alike. The banner scales itself to whatever
 * width it lands in, so the two callers differ only in how many columns
 * they hand it.
 */
export function DealBannerCard({
  deal,
  label,
  remainingLabel,
  daily,
  isPurchased,
  isLoading,
  onBuy,
  maxScale,
}: {
  deal: ShopDeal;
  label: string;
  remainingLabel: string;
  /** Which of the two deals this is; picks the skin. */
  daily: boolean;
  isPurchased: boolean;
  isLoading: boolean;
  onBuy: () => void;
  maxScale?: number;
}) {
  const { t } = useLanguage();

  // Frame 637:352 — PRO time, powers, coins.
  const tiles = [
    {
      icon: bannerCrownIcon,
      iconSize: 64.785,
      iconLeft: 85.24,
      iconTop: 152.24,
      // Three durations now, so the old two-way check would have called two
      // days "one day" — the label has to name what is actually granted.
      label:
        deal.contents.vip === "week"
          ? t("shop.vipWeek")
          : deal.contents.vip === "2days"
            ? t("shop.vipTwoDays")
            : t("shop.vipDay"),
      labelTop: 231,
      labelWidth: 124,
      labelCenter: 118,
    },
    {
      icon: bannerPowersIcon,
      iconSize: 58,
      iconLeft: 257,
      iconTop: 159,
      label: t("shop.allPowersTimes").replace("{count}", String(deal.contents.powers)),
      labelTop: 230,
      labelWidth: 124,
      labelCenter: 288,
    },
    {
      icon: bannerCoinIcon,
      iconSize: 67,
      iconLeft: 423,
      iconTop: 154,
      label: `${deal.contents.coins.toLocaleString()} ${t("shop.coin")}`,
      labelTop: 233,
      labelWidth: 124,
      labelCenter: 457,
    },
  ];

  return (
    <DealBanner
      skin={SKIN_WHITE}
      title={t(deal.nameKey)}
      savings={dealSavings(deal)}
      stripIcon={bannerDiscountIcon}
      stripLabel={label}
      remainingIcon={bannerTimerIcon}
      remaining={remainingLabel}
      tiles={tiles}
      price={deal.price}
      wasPrice={deal.wasPrice}
      gemIcon={gemIcon}
      maxScale={maxScale}
      actionLabel={isLoading ? "…" : isPurchased ? t("common.owned") : t("extra.purchaseBtn")}
      actionDisabled={isPurchased || isLoading}
      onAction={onBuy}
    />
  );
}
