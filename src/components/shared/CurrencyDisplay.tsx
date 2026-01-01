import { motion } from "framer-motion";
import { useCurrency } from "@/hooks/useCurrency";
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
    sm: { icon: "w-4 h-4", text: "text-sm", padding: "px-2 py-1", gap: "gap-1" },
    md: { icon: "w-5 h-5", text: "text-base", padding: "px-3 py-1.5", gap: "gap-1.5" },
    lg: { icon: "w-6 h-6", text: "text-lg", padding: "px-4 py-2", gap: "gap-2" },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showCoins && (
        <motion.div
          className={`liquid-glass rounded-2xl flex items-center ${config.gap} ${config.padding}`}
          whileHover={{ scale: 1.02 }}
        >
          <img src={coinIcon} alt="Coins" className={config.icon} />
          <motion.span
            key={coins}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`font-bold text-foreground ${config.text}`}
          >
            {coins.toLocaleString()}
          </motion.span>
        </motion.div>
      )}

      {showGems && (
        <motion.div
          className={`liquid-glass rounded-2xl flex items-center ${config.gap} ${config.padding}`}
          whileHover={{ scale: 1.02 }}
        >
          <img src={gemIcon} alt="Gems" className={config.icon} />
          <motion.span
            key={gems}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`font-bold text-purple-600 ${config.text}`}
          >
            {gems.toLocaleString()}
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}
