import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";

interface ShopCurrencyBarProps {
  onCurrencyPlusClick: (currencyType: "coins" | "gems") => void;
}

export function ShopCurrencyBar({ onCurrencyPlusClick }: ShopCurrencyBarProps) {
  const { coins, gems } = useCurrency();

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-4">
        {/* Coins Balance with Add Button */}
        <motion.button
          onClick={() => onCurrencyPlusClick("coins")}
          className="flex items-center gap-2 group"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <div 
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <img src={coinIcon} alt="" className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-foreground drop-shadow-sm">{formatCompactNumber(coins)}</span>
          <div className="w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </div>
        </motion.button>

        {/* Gems Balance with Add Button */}
        <motion.button
          onClick={() => onCurrencyPlusClick("gems")}
          className="flex items-center gap-2 group"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <div 
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <img src={gemIcon} alt="" className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-foreground drop-shadow-sm">{formatCompactNumber(gems)}</span>
          <div className="w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}
