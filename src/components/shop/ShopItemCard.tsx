import { motion } from "framer-motion";
import { Check, Clock, Flame, Star } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";

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
  description,
  price,
  currency,
  icon,
  gradient,
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
        className="w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden"
        style={{
          background: isPurchased
            ? "linear-gradient(180deg, hsl(150 70% 92%) 0%, hsl(145 65% 85%) 100%)"
            : canAfford
            ? "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.3) 100%)"
            : "hsl(var(--muted))",
          boxShadow: isPurchased
            ? "0 4px 0 hsl(145 60% 70%)"
            : canAfford
            ? "0 4px 0 hsl(var(--border)), inset 0 1px 2px hsl(0 0% 100% / 0.5)"
            : "0 3px 0 hsl(var(--border))",
          border: isPurchased ? "2px solid hsl(145 70% 50%)" : "2px solid hsl(var(--border))",
          opacity: !canAfford && !isPurchased ? 0.6 : 1,
        }}
        whileHover={!isPurchased && canAfford ? { scale: 1.02, y: -3 } : {}}
        whileTap={!isPurchased && canAfford ? { scale: 0.98, y: 0 } : {}}
      >
        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: "-100%", opacity: 0 }}
          whileHover={{ x: "100%", opacity: 0.2 }}
          transition={{ duration: 0.6 }}
          style={{
            background: "linear-gradient(90deg, transparent, hsl(0 0% 100%), transparent)",
          }}
        />

        {/* Icon Container */}
        <motion.div
          className={`flex items-center justify-center mx-auto mb-3 relative ${
            gradient === "transparent" ? "w-[50px] h-[50px]" : "w-14 h-14 rounded-2xl"
          }`}
          style={{
            background: gradient === "transparent" ? "transparent" : gradient,
            boxShadow: gradient === "transparent" ? "none" : "0 4px 8px hsl(0 0% 0% / 0.15), inset 0 1px 2px hsl(0 0% 100% / 0.3)",
          }}
          whileHover={{ scale: gradient === "transparent" ? 1.05 : 1, rotate: gradient === "transparent" ? 0 : [0, -5, 5, 0] }}
          transition={{ duration: 0.3 }}
        >
          {icon}
          {isPurchased && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center"
              style={{ boxShadow: "0 2px 0 hsl(142 60% 30%)" }}
            >
              <Check className="w-4 h-4 text-success-foreground" />
            </motion.div>
          )}
        </motion.div>

        {/* Name */}
        <h3 className="text-foreground font-bold text-sm text-center mb-1">{name}</h3>

        {/* Description */}
        <p className="text-muted-foreground text-xs text-center mb-3 line-clamp-2">{description}</p>

        {/* Price / Status */}
        <div className="flex justify-center items-center h-10">
          {isPurchased ? (
            <div className="flex items-center gap-1 text-success font-bold text-sm px-3 py-1.5">
              <Check className="w-4 h-4" />
              <span>შეძენილი</span>
            </div>
          ) : isLoading ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <motion.div
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full"
              style={{
                background:
                  currency === "gems"
                    ? "linear-gradient(180deg, hsl(263 76% 92%) 0%, hsl(263 70% 85%) 100%)"
                    : "linear-gradient(180deg, hsl(45 90% 88%) 0%, hsl(40 85% 80%) 100%)",
                boxShadow:
                  currency === "gems"
                    ? "0 2px 0 hsl(263 60% 70%)"
                    : "0 2px 0 hsl(35 80% 60%)",
              }}
              whileHover={{ scale: 1.05 }}
            >
              <img src={currencyIcon} alt="" className="w-4 h-4" />
              <span
                className={`font-bold text-sm ${
                  currency === "gems" ? "text-primary" : "text-amber-800"
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
