import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HeaderActions } from "@/components/shared/HeaderActions";
import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import safeIcon from "@/assets/icons/icon-safe.png";

interface ShopHeaderProps {
  onHelpClick: () => void;
  onCurrencyPlusClick?: (currencyType: "coins" | "gems") => void;
}

export function ShopHeader({ onHelpClick }: ShopHeaderProps) {
  const { t } = useLanguage();
  const { coins, gems } = useCurrency();

  const WalletDisplay = () => (
    <div className="flex items-center gap-3">
      {/* Safe icon */}
      <img src={safeIcon} alt="" className="w-7 h-7" />
      
      {/* Coins */}
      <div className="flex items-center gap-1.5">
        <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
          <img src={coinIcon} alt="" className="w-4 h-4" />
        </div>
        <span className="font-bold text-sm text-foreground">{formatCompactNumber(coins)}</span>
      </div>
      
      {/* Gems */}
      <div className="flex items-center gap-1.5">
        <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
          <img src={gemIcon} alt="" className="w-4 h-4" />
        </div>
        <span className="font-bold text-sm text-foreground">{formatCompactNumber(gems)}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="px-[15px] pt-4 pb-3">
        <div className="flex items-center justify-between">
          {/* Left side: title */}
          <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
            {t("shop.title")}
          </h1>

          {/* Right side: Wallet + action icons */}
          <div className="flex items-center gap-3">
            <WalletDisplay />
            
            {/* Divider - desktop/tablet only */}
            <div className="hidden md:block w-px h-6 bg-border/50" />
            
            <HeaderActions />
            
            <motion.button
              onClick={onHelpClick}
              className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}