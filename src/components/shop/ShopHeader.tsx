import { motion } from "framer-motion";
import { HelpCircle, Plus } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";

interface ShopHeaderProps {
  onHelpClick: () => void;
  onBuyGemsClick: () => void;
  onBuyCoinsClick?: () => void;
}

export function ShopHeader({ onHelpClick, onBuyGemsClick, onBuyCoinsClick }: ShopHeaderProps) {
  const { coins, gems } = useCurrency();

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md">
      <div className="px-4 pt-4 pb-3">
        {/* Top Row: Title + Help */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
            მაღაზია
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
        <div className="flex items-center gap-2">
          {/* Coins Balance with Add Button */}
          <motion.button
            onClick={onBuyCoinsClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full group"
            style={{
              background: "linear-gradient(180deg, hsl(160 60% 88%) 0%, hsl(155 55% 78%) 100%)",
              boxShadow: "0 3px 0 hsl(150 50% 55%)",
              border: "2px solid hsl(155 50% 70%)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <img src={coinIcon} alt="" className="w-5 h-5" />
            <span className="font-bold text-emerald-800">{formatCompactNumber(coins)}</span>
            <motion.div
              className="w-5 h-5 rounded-full bg-emerald-700/20 flex items-center justify-center ml-0.5"
              whileHover={{ scale: 1.1 }}
            >
              <Plus className="w-4 h-4 text-emerald-700" />
            </motion.div>
          </motion.button>

          {/* Gems Balance with Add Button */}
          <motion.button
            onClick={onBuyGemsClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full group"
            style={{
              background: "linear-gradient(180deg, hsl(263 76% 92%) 0%, hsl(263 70% 85%) 100%)",
              boxShadow: "0 3px 0 hsl(263 60% 70%)",
              border: "2px solid hsl(263 60% 80%)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <img src={gemIcon} alt="" className="w-5 h-5" />
            <span className="font-bold text-primary">{formatCompactNumber(gems)}</span>
            <motion.div
              className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center ml-0.5"
              whileHover={{ scale: 1.1 }}
            >
              <Plus className="w-4 h-4 text-primary" />
            </motion.div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
