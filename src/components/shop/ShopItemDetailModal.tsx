import { motion } from "framer-motion";
import { GameModal } from "@/components/ui/game-modal";
import iconGem from "@/assets/icons/icon-gem.png";
import iconCoin from "@/assets/icons/icon-coin.png";

interface ShopItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: "gems" | "coins";
    icon: React.ReactNode;
  } | null;
  canAfford: boolean;
  isPurchased: boolean;
  isLoading: boolean;
  onBuy: () => void;
}

export function ShopItemDetailModal({
  isOpen,
  onClose,
  item,
  canAfford,
  isPurchased,
  isLoading,
  onBuy,
}: ShopItemDetailModalProps) {
  if (!item) return null;

  const currencyIcon = item.currency === "gems" ? iconGem : iconCoin;

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="primary"
      title={item.name}
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {/* Icon */}
        <motion.div
          className="w-20 h-20 flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full">
            {item.icon}
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          className="text-muted-foreground text-center text-sm leading-relaxed px-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {item.description}
        </motion.p>

        {/* Buy Button */}
        <motion.div
          className="w-full mt-2 flex justify-center"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {isPurchased ? (
            <div className="flex items-center justify-center gap-2 text-success font-bold py-3">
              <span>✓</span>
              <span>შეძენილია</span>
            </div>
          ) : (
            <button
              onClick={onBuy}
              disabled={!canAfford || isLoading}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-amber-900 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              style={{
                background: "linear-gradient(180deg, hsl(45 95% 60%) 0%, hsl(40 90% 50%) 100%)",
                boxShadow: "0 4px 0 hsl(35 85% 40%), 0 6px 12px rgba(0,0,0,0.15)",
              }}
            >
              <img src={currencyIcon} alt="" className="w-5 h-5" />
              <span>{isLoading ? "..." : `ყიდვა ${item.price}`}</span>
            </button>
          )}
        </motion.div>
      </div>
    </GameModal>
  );
}
