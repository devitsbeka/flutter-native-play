import { motion } from "framer-motion";
import { Crown, HelpCircle, Plus } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";

interface ShopHeaderProps {
  onHelpClick: () => void;
  onBuyGemsClick: () => void;
}

export function ShopHeader({ onHelpClick, onBuyGemsClick }: ShopHeaderProps) {
  const { coins, gems } = useCurrency();
  const { isVip, getDaysRemaining } = useVipStatus();

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
        <div className="flex items-center gap-2 mb-3">
          {/* Coins Balance */}
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "linear-gradient(180deg, hsl(45 90% 88%) 0%, hsl(40 85% 80%) 100%)",
              boxShadow: "0 3px 0 hsl(35 80% 60%)",
              border: "2px solid hsl(45 80% 75%)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <img src={coinIcon} alt="" className="w-5 h-5" />
            <span className="font-bold text-amber-800">{coins.toLocaleString()}</span>
          </motion.div>

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
            <span className="font-bold text-primary">{gems.toLocaleString()}</span>
            <motion.div
              className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center ml-0.5"
              whileHover={{ scale: 1.1 }}
            >
              <Plus className="w-3 h-3 text-primary" />
            </motion.div>
          </motion.button>
        </div>

        {/* VIP Status Banner */}
        {isVip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2.5 rounded-xl flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, hsl(45 90% 80%) 0%, hsl(35 90% 75%) 100%)",
              boxShadow: "0 3px 0 hsl(30 70% 50%), inset 0 1px 2px hsl(0 0% 100% / 0.5)",
              border: "2px solid hsl(40 80% 70%)",
            }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Crown className="w-5 h-5 text-amber-700" />
              </motion.div>
              <span className="text-amber-900 font-bold">VIP აქტიური</span>
            </div>
            <span className="text-amber-800 text-sm font-bold bg-amber-100/50 px-2 py-0.5 rounded-full">
              {getDaysRemaining()} დღე
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
