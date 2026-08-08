import { motion } from "framer-motion";
import { Check } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.webp";
import coinIcon from "@/assets/icons/icon-coin.webp";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPrice } from "@/utils/currency";

export type ShopItemBadge = "popular" | "best-value" | "limited" | "new" | null;
export type ShopItemCurrency = "gems" | "coins" | "lari";

export interface ShopItemCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: ShopItemCurrency;
  icon: React.ReactNode;
  gradient: string;
  badge?: ShopItemBadge;
  savings?: number;
  isPurchased?: boolean;
  isLoading?: boolean;
  canAfford?: boolean;
  index?: number;
  showDescription?: boolean;
  onClick: () => void;
}

export function ShopItemCard({
  name,
  description,
  price,
  currency,
  icon,
  badge,
  savings,
  isPurchased = false,
  isLoading = false,
  canAfford = true,
  showDescription = true,
  onClick,
}: ShopItemCardProps) {
  const { t } = useLanguage();
  const currencyIcon = currency === "gems" ? gemIcon : currency === "coins" ? coinIcon : null;
  const isLari = currency === "lari";

  const BADGE_STYLES: Record<string, { textKey: string; bg: string; shadow: string }> = {
    popular: {
      textKey: "popular",
      bg: "linear-gradient(135deg, hsl(340 80% 55%) 0%, hsl(25 90% 55%) 100%)",
      shadow: "0 2px 0 hsl(340 70% 40%)",
    },
    "best-value": {
      textKey: "bestValue",
      bg: "linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(160 60% 40%) 100%)",
      shadow: "0 2px 0 hsl(142 60% 30%)",
    },
    limited: {
      textKey: "limited",
      bg: "linear-gradient(135deg, hsl(25 95% 55%) 0%, hsl(0 80% 50%) 100%)",
      shadow: "0 2px 0 hsl(15 80% 40%)",
    },
    new: {
      textKey: "new",
      bg: "linear-gradient(135deg, hsl(200 80% 50%) 0%, hsl(180 70% 45%) 100%)",
      shadow: "0 2px 0 hsl(200 70% 35%)",
    },
  };

  const getBadgeText = (badgeKey: string): string => {
    const badgeTexts: Record<string, string> = {
      popular: t("common.popular"),
      bestValue: t("common.bestValue"),
      limited: t("common.limited"),
      new: t("common.new"),
    };
    return badgeTexts[badgeKey] || badgeKey;
  };

  const badgeStyle = badge ? BADGE_STYLES[badge] : null;

  // Badged items are the store's hero deals — they get a colored ring + glow
  // so they pop like featured offers in game shops.
  const dealRing =
    !isPurchased && badge === "best-value"
      ? "ring-2 ring-amber-400/90 shadow-[0_10px_28px_-8px_rgba(245,158,11,0.55)]"
      : !isPurchased && badge === "popular"
        ? "ring-2 ring-pink-400/90 shadow-[0_10px_28px_-8px_rgba(236,72,153,0.5)]"
        : !isPurchased && badge === "limited"
          ? "ring-2 ring-orange-400/90 shadow-[0_10px_28px_-8px_rgba(249,115,22,0.5)]"
          : "";

  return (
    <div
      className="relative pt-3"
      // Skip offscreen rendering work while scrolling long shop lists
      style={{ contentVisibility: "auto", containIntrinsicSize: "226px" } as React.CSSProperties}
    >
      {/* Badge - positioned on right */}
      {badgeStyle && !isPurchased && (
        <div
          className="absolute top-0 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white z-10 motion-safe:animate-pulse-soft"
          style={{
            background: badgeStyle.bg,
            boxShadow: badgeStyle.shadow,
          }}
        >
          {getBadgeText(badgeStyle.textKey)}
        </div>
      )}

      {/* Savings Badge - positioned on left */}
      {savings && !isPurchased && (
        <div
          className="absolute top-0 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 z-10"
          style={{
            background: "linear-gradient(180deg, hsl(50 95% 65%) 0%, hsl(45 90% 55%) 100%)",
            boxShadow: "0 2px 0 hsl(40 80% 45%)",
          }}
        >
          -{savings}%
        </div>
      )}

      <div
        className={cn(
          "w-full rounded-2xl transition-all relative overflow-hidden flex flex-col items-center text-center",
          "px-2.5 sm:px-3 p-3",
          "h-[188px] sm:h-[198px]",
          !isPurchased && canAfford && "liquid-glass",
          dealRing
        )}
        style={{
          background: isPurchased
            ? "linear-gradient(180deg, hsl(150 70% 92%) 0%, hsl(145 65% 85%) 100%)"
            : !canAfford
            ? "hsl(var(--muted))"
            : undefined,
          boxShadow: isPurchased
            ? "0 4px 0 hsl(145 60% 70%)"
            : !canAfford
            ? "0 3px 0 hsl(var(--border))"
            : undefined,
          border: isPurchased ? "2px solid hsl(145 70% 50%)" : undefined,
        }}
      >
        {/* Icon - Top */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center mb-1">
          <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </div>
        </div>

        {/* Name */}
        <h3 className="text-gray-900 font-bold text-[13px] sm:text-sm leading-tight mb-0.5">{name}</h3>

        {/* Description - flex-1 to push price section to bottom */}
        {showDescription && description && (
          <div className="flex-1 flex items-start">
            <p className="text-gray-500 text-[11px] sm:text-xs leading-snug line-clamp-2 w-full">{description}</p>
          </div>
        )}

        {/* Price / Status - Bottom */}
        <div className="mt-auto w-full flex flex-col items-center gap-0.5">
          {isPurchased ? (
            <div className="flex items-center justify-center gap-1 text-success font-bold text-sm px-4 py-2 rounded-full bg-success/10">
              <Check className="w-5 h-5" />
              <span>{t("common.owned")}</span>
            </div>
          ) : isLoading ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isLari ? (
            <>
              {/* Price Display */}
              <span className="font-bold text-base sm:text-lg text-pink-600 dark:text-pink-400">{formatPrice(price)}</span>
              {/* Buy Button - only this is clickable */}
              <motion.button
                onClick={onClick}
                disabled={isPurchased || isLoading}
                className="px-4 py-1.5 rounded-full font-bold text-xs text-white"
                style={{
                  background: "#00DDA3",
                  boxShadow: "0 3px 0 #00A87C",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                {t('shop.buy')}
              </motion.button>
            </>
          ) : (
            <>
              {/* Price Display */}
              <div className="flex items-center justify-center gap-1">
                <img src={currencyIcon!} alt="" width={24} height={24} loading="lazy" decoding="async" className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-bold text-sm sm:text-base text-gray-800">{price}</span>
              </div>
              {/* Buy Button - only this is clickable */}
              <motion.button
                onClick={onClick}
                disabled={isPurchased || isLoading}
                className="px-4 py-1.5 rounded-full font-bold text-xs text-white"
                style={{
                  background: "#00DDA3",
                  boxShadow: "0 3px 0 #00A87C",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                {t('shop.buy')}
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
