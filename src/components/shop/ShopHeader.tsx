import { motion } from "framer-motion";
import { HelpCircle, Plus } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShopHeaderProps {
  onHelpClick: () => void;
  onCurrencyPlusClick: (currencyType: "coins" | "gems") => void;
}

export function ShopHeader({ onHelpClick, onCurrencyPlusClick }: ShopHeaderProps) {
  const { coins, gems } = useCurrency();
  const { t } = useLanguage();

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md">
      <div className="px-4 pt-4 pb-3">
        {/* Top Row: Title + Help */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
            {t("shop.title")}
          </h1>

          <motion.button
            onClick={onHelpClick}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            style={{ boxShadow: "0 3px 0 hsl(var(--border))" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 2 }}
          >
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Currency Row */}
        <div className="flex items-center gap-4">
          {/* Coins Balance with Add Button */}
          <motion.button
            onClick={() => onCurrencyPlusClick("coins")}
            className="flex items-center gap-2 group"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <div 
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            >
              <img src={coinIcon} alt="" className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg text-foreground">{formatCompactNumber(coins)}</span>
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
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
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            >
              <img src={gemIcon} alt="" className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg text-foreground">{formatCompactNumber(gems)}</span>
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
