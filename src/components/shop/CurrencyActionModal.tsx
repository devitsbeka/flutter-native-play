import { motion } from "framer-motion";
import { ShoppingBag, ArrowLeftRight } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

export type CurrencyType = "coins" | "gems";

interface CurrencyActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyType: CurrencyType;
  onBuyClick: () => void;
  onExchangeClick: () => void;
}

export function CurrencyActionModal({
  isOpen,
  onClose,
  currencyType,
  onBuyClick,
  onExchangeClick,
}: CurrencyActionModalProps) {
  const { t } = useLanguage();
  const isCoins = currencyType === "coins";
  const title = isCoins ? t("shop.coins") : t("shop.gems");
  const icon = isCoins ? coinIcon : gemIcon;

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={<img src={icon} alt="" className="w-10 h-10" />}
      variant="primary"
    >
      <div className="flex gap-3 pt-2">
        {/* Buy Button */}
        <motion.button
          onClick={onBuyClick}
          className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg"
          style={{ boxShadow: "0 4px 0 hsl(270 60% 35%)" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98, y: 2 }}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <span className="font-bold text-base">{t("shop.buy")}</span>
        </motion.button>

        {/* Exchange Button */}
        <motion.button
          onClick={onExchangeClick}
          className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"
          style={{ boxShadow: "0 4px 0 hsl(30 70% 35%)" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98, y: 2 }}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <span className="font-bold text-base">{t("shop.exchange")}</span>
        </motion.button>
      </div>
    </GameModal>
  );
}
