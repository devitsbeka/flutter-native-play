import { motion } from "framer-motion";
import { Check } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export type ShopItemBadge = "popular" | "best-value" | "limited" | "new" | null;

export interface ShopItemCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "gems" | "coins";
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
  index = 0,
  showDescription = true,
  onClick,
}: ShopItemCardProps) {
  const { t } = useLanguage();
  const currencyIcon = currency === "gems" ? gemIcon : coinIcon;

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
      popular: t("common.popular") || "პოპულარული",
      bestValue: t("common.bestValue") || "საუკეთესო ფასი",
      limited: t("common.limited") || "შეზღუდული",
      new: t("common.new") || "ახალი",
    };
    return badgeTexts[badgeKey] || badgeKey;
  };

  const badgeStyle = badge ? BADGE_STYLES[badge] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="relative pt-3"
    >
      {/* Badge - positioned on right */}
      {badgeStyle && !isPurchased && (
        <motion.div
          className="absolute top-0 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white z-10"
          style={{
            background: badgeStyle.bg,
            boxShadow: badgeStyle.shadow,
          }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {getBadgeText(badgeStyle.textKey)}
        </motion.div>
      )}

      {/* Savings Badge - positioned on left */}
      {savings && !isPurchased && (
        <motion.div
          className="absolute top-0 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 z-10"
          style={{
            background: "linear-gradient(180deg, hsl(50 95% 65%) 0%, hsl(45 90% 55%) 100%)",
            boxShadow: "0 2px 0 hsl(40 80% 45%)",
          }}
        >
          -{savings}%
        </motion.div>
      )}

      <motion.button
        onClick={onClick}
        disabled={isPurchased || isLoading}
        className={cn(
          "w-full p-4 rounded-2xl transition-all relative overflow-hidden flex flex-col items-center text-center",
          !isPurchased && canAfford && "liquid-glass"
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
          opacity: !canAfford && !isPurchased ? 0.6 : 1,
          aspectRatio: "1 / 1.25",
        }}
        whileHover={!isPurchased && canAfford ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isPurchased && canAfford ? { scale: 0.98, y: 0 } : {}}
      >
        {/* Icon - Top */}
        <motion.div
          className="w-14 h-14 flex items-center justify-center mb-3"
          whileHover={{ scale: 1.05 }}
        >
          <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </div>
        </motion.div>

        {/* Name */}
        <h3 className="text-gray-900 font-bold text-sm leading-tight mb-1">{name}</h3>
        
        {/* Description */}
        {showDescription && description && (
          <p className="text-gray-500 text-xs line-clamp-3 mb-3 flex-1">{description}</p>
        )}

        {/* Price / Status - Bottom */}
        <div className="mt-auto">
          {isPurchased ? (
            <div className="flex items-center justify-center gap-1 text-success font-bold text-xs px-3 py-1.5 rounded-full bg-success/10">
              <Check className="w-4 h-4" />
              <span>{t("common.owned") || "შეძენილი"}</span>
            </div>
          ) : isLoading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <motion.div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(147, 89, 221, 0.15), rgba(147, 89, 221, 0.08))",
              }}
            >
              <img src={currencyIcon} alt="" className="w-4 h-4" />
              <span className="font-bold text-sm text-[#9359DD]">{price} {t('shop.buy')}</span>
            </motion.div>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}
