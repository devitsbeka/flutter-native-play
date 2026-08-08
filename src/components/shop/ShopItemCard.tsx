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
  /** Fill the card with its gradient (hero bundles) instead of the neutral surface. */
  vibrant?: boolean;
  isPurchased?: boolean;
  isLoading?: boolean;
  canAfford?: boolean;
  index?: number;
  showDescription?: boolean;
  /** Full-row horizontal card — used when a section's odd last item stretches across the row. */
  featured?: boolean;
  onClick: () => void;
}

export function ShopItemCard({
  name,
  description,
  price,
  currency,
  icon,
  gradient,
  badge,
  savings,
  vibrant = false,
  isPurchased = false,
  isLoading = false,
  canAfford = true,
  showDescription = true,
  featured = false,
  onClick,
}: ShopItemCardProps) {
  const { t } = useLanguage();
  const currencyIcon = currency === "gems" ? gemIcon : currency === "coins" ? coinIcon : null;
  const isLari = currency === "lari";
  // Hero bundles opt in to their own gradient fill so they stand apart from
  // the regular lavender-white content cards; white text rides on top of it.
  const hasGradient = vibrant && !!gradient && gradient !== "transparent";

  // Shared by both the vertical and the featured horizontal layout
  const actionBlock = isPurchased ? (
    <div className="flex items-center justify-center gap-1 text-success font-bold text-sm px-4 py-2 rounded-full bg-success/10">
      <Check className="w-5 h-5" />
      <span>{t("common.owned")}</span>
    </div>
  ) : isLoading ? (
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  ) : (
    <>
      {isLari ? (
        <span className="font-bold text-base sm:text-lg text-pink-600 dark:text-pink-400">{formatPrice(price)}</span>
      ) : (
        <div className="flex items-center justify-center gap-1">
          <img src={currencyIcon!} alt="" width={24} height={24} loading="lazy" decoding="async" className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className={`font-bold text-sm sm:text-base ${hasGradient ? "text-white drop-shadow-sm" : "text-gray-800"}`}>{price}</span>
        </div>
      )}
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
  );

  if (featured) {
    return (
      <div className="relative pt-3">
        {savings && !isPurchased && (
          <div
            className="absolute top-0 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 z-10"
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
            "w-full rounded-[24px] transition-all relative overflow-hidden flex items-center gap-4 text-left",
            "px-4 sm:px-6 py-5",
            // Full-row widgets (deals, bundles, VIP month...) share one height
            "min-h-[250px]",
            !isPurchased && canAfford && !hasGradient && "liquid-glass"
          )}
          style={{
            background: isPurchased
              ? "linear-gradient(180deg, hsl(150 70% 92%) 0%, hsl(145 65% 85%) 100%)"
              : !canAfford
              ? "hsl(var(--muted))"
              : hasGradient
              ? gradient
              : undefined,
            boxShadow: isPurchased
              ? "0 4px 0 hsl(145 60% 70%)"
              : !canAfford
              ? "0 3px 0 hsl(var(--border))"
              : hasGradient
              ? "0 3.6px 0 0 rgba(0,0,0,0.22), inset 0 1.8px 0 0 rgba(255,255,255,0.35)"
              : undefined,
            border: isPurchased
              ? "2px solid hsl(145 70% 50%)"
              : hasGradient
              ? "1.5px solid rgba(255,255,255,0.35)"
              : undefined,
          }}
        >
          <div className={cn("shrink-0 flex items-center justify-center", hasGradient ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16 sm:w-20 sm:h-20")}>
            <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full drop-shadow-md">
              {icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-bold leading-tight mb-0.5", hasGradient ? "text-white drop-shadow-sm text-base sm:text-lg" : "text-gray-900 text-sm sm:text-base")}>{name}</h3>
            {showDescription && description && (
              <p className={cn("text-[11px] sm:text-xs leading-snug line-clamp-2", hasGradient ? "text-white/85" : "text-gray-500")}>{description}</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-center gap-1.5">{actionBlock}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative pt-3"
      // Skip offscreen rendering work while scrolling long shop lists
      style={{ contentVisibility: "auto", containIntrinsicSize: "226px" } as React.CSSProperties}
    >
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
          "w-full rounded-[24px] transition-all relative overflow-hidden flex flex-col items-center text-center",
          "px-2.5 sm:px-3 p-3",
          "h-[188px] sm:h-[198px]",
          !isPurchased && canAfford && !hasGradient && "liquid-glass"
        )}
        style={{
          background: isPurchased
            ? "linear-gradient(180deg, hsl(150 70% 92%) 0%, hsl(145 65% 85%) 100%)"
            : !canAfford
            ? "hsl(var(--muted))"
            : hasGradient
            ? gradient
            : undefined,
          boxShadow: isPurchased
            ? "0 4px 0 hsl(145 60% 70%)"
            : !canAfford
            ? "0 3px 0 hsl(var(--border))"
            : hasGradient
            ? "0 3.6px 0 0 rgba(0,0,0,0.22), inset 0 1.8px 0 0 rgba(255,255,255,0.35)"
            : undefined,
          border: isPurchased
            ? "2px solid hsl(145 70% 50%)"
            : hasGradient
            ? "1.5px solid rgba(255,255,255,0.35)"
            : undefined,
        }}
      >
        {/* Icon - Top */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center mb-1">
          <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </div>
        </div>

        {/* Name */}
        <h3 className={cn("font-bold text-[13px] sm:text-sm leading-tight mb-0.5", hasGradient ? "text-white drop-shadow-sm" : "text-gray-900")}>{name}</h3>

        {/* Description - flex-1 to push price section to bottom */}
        {showDescription && description && (
          <div className="flex-1 flex items-start">
            <p className={cn("text-[11px] sm:text-xs leading-snug line-clamp-2 w-full", hasGradient ? "text-white/85" : "text-gray-500")}>{description}</p>
          </div>
        )}

        {/* Price / Status - Bottom (buy button is the only clickable part) */}
        <div className="mt-auto w-full flex flex-col items-center gap-0.5">{actionBlock}</div>
      </div>
    </div>
  );
}
