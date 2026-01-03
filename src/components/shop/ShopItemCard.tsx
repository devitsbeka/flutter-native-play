import { motion } from "framer-motion";
import { Check } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { cn } from "@/lib/utils";

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
  onClick: () => void;
}

const BADGE_STYLES: Record<string, { text: string; bg: string; shadow: string }> = {
  popular: {
    text: "პოპულარული",
    bg: "linear-gradient(135deg, hsl(340 80% 55%) 0%, hsl(25 90% 55%) 100%)",
    shadow: "0 2px 0 hsl(340 70% 40%)",
  },
  "best-value": {
    text: "საუკეთესო ფასი",
    bg: "linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(160 60% 40%) 100%)",
    shadow: "0 2px 0 hsl(142 60% 30%)",
  },
  limited: {
    text: "შეზღუდული",
    bg: "linear-gradient(135deg, hsl(25 95% 55%) 0%, hsl(0 80% 50%) 100%)",
    shadow: "0 2px 0 hsl(15 80% 40%)",
  },
  new: {
    text: "ახალი",
    bg: "linear-gradient(135deg, hsl(200 80% 50%) 0%, hsl(180 70% 45%) 100%)",
    shadow: "0 2px 0 hsl(200 70% 35%)",
  },
};

export function ShopItemCard({
  name,
  price,
  currency,
  icon,
  badge,
  savings,
  isPurchased = false,
  isLoading = false,
  canAfford = true,
  index = 0,
  onClick,
}: ShopItemCardProps) {
  const currencyIcon = currency === "gems" ? gemIcon : coinIcon;
  const badgeStyle = badge ? BADGE_STYLES[badge] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Badge */}
      {badgeStyle && !isPurchased && (
        <motion.div
          className="absolute -top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white z-10"
          style={{
            background: badgeStyle.bg,
            boxShadow: badgeStyle.shadow,
          }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {badgeStyle.text}
        </motion.div>
      )}

      {/* Savings Badge */}
      {savings && !isPurchased && (
        <motion.div
          className="absolute -top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 z-10"
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
          "w-full p-4 rounded-2xl transition-all relative overflow-hidden flex flex-col items-center gap-3",
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
        }}
        whileHover={!isPurchased && canAfford ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isPurchased && canAfford ? { scale: 0.98, y: 0 } : {}}
      >
        {/* Icon - Top */}
        <motion.div
          className="w-10 h-10 flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
        >
          <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </div>
        </motion.div>

        {/* Name - Center */}
        <div className="text-center">
          <h3 className="text-gray-900 font-bold text-sm leading-tight">{name}</h3>
        </div>

        {/* Price / Status - Bottom */}
        <div className="w-full flex justify-center">
          {isPurchased ? (
            <div className="flex items-center gap-1 text-success font-bold text-xs px-2 py-1">
              <Check className="w-4 h-4" />
            </div>
          ) : isLoading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <motion.div
              className="flex items-center gap-1 px-3 py-1.5 rounded-full"
              style={{
                background:
                  currency === "gems"
                    ? "linear-gradient(180deg, #A76EE7 0%, #9359DD 100%)"
                    : "linear-gradient(180deg, hsl(45 90% 88%) 0%, hsl(40 85% 80%) 100%)",
                boxShadow:
                  currency === "gems"
                    ? "0 2px 0 #7A3FC5"
                    : "0 2px 0 hsl(35 80% 60%)",
              }}
              whileHover={{ scale: 1.05 }}
            >
              <span className={`font-semibold text-xs ${currency === "gems" ? "text-white" : "text-amber-800"}`}>
                ყიდვა
              </span>
              <img src={currencyIcon} alt="" className="w-3.5 h-3.5" />
              <span
                className={`font-bold text-sm ${
                  currency === "gems" ? "text-white" : "text-amber-800"
                }`}
              >
                {price.toLocaleString()}
              </span>
            </motion.div>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}
