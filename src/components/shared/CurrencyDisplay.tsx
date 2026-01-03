import { motion } from "framer-motion";
import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

interface CurrencyDisplayProps {
  showCoins?: boolean;
  showGems?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CurrencyDisplay({
  showCoins = true,
  showGems = true,
  size = "md",
  className = "",
}: CurrencyDisplayProps) {
  const { coins, gems } = useCurrency();

  const sizeConfig = {
    sm: { icon: "w-4 h-4", text: "text-sm", padding: "px-3 py-1.5", gap: "gap-1.5" },
    md: { icon: "w-5 h-5", text: "text-base", padding: "px-4 py-2", gap: "gap-2" },
    lg: { icon: "w-6 h-6", text: "text-lg", padding: "px-5 py-2.5", gap: "gap-2" },
  };

  const config = sizeConfig[size];

  // White 3D chunky chip style
  const chipStyle = "bg-white rounded-full flex items-center shadow-[0_4px_0_0_rgba(0,0,0,0.1),0_6px_12px_-2px_rgba(0,0,0,0.15),inset_0_-2px_4px_rgba(0,0,0,0.05),inset_0_2px_4px_rgba(255,255,255,0.9)] border border-black/5";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showCoins && (
        <motion.div
          className={`${chipStyle} ${config.gap} ${config.padding}`}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98, y: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <img src={coinIcon} alt="Coins" className={config.icon} />
          <motion.span
            key={coins}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`font-bold text-gray-900 ${config.text}`}
          >
            {formatCompactNumber(coins)}
          </motion.span>
        </motion.div>
      )}

      {showGems && (
        <motion.div
          className={`${chipStyle} ${config.gap} ${config.padding}`}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98, y: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <img src={gemIcon} alt="Gems" className={config.icon} />
          <motion.span
            key={gems}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`font-bold text-gray-900 ${config.text}`}
          >
            {formatCompactNumber(gems)}
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}
