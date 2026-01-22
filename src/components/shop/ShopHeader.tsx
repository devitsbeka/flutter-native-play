import { motion } from "framer-motion";
import { HelpCircle, Wallet } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HeaderActions } from "@/components/shared/HeaderActions";
import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";

interface ShopHeaderProps {
  onHelpClick: () => void;
  onCurrencyPlusClick?: (currencyType: "coins" | "gems") => void;
}

export function ShopHeader({ onHelpClick }: ShopHeaderProps) {
  const { t } = useLanguage();
  const { coins, gems } = useCurrency();

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-purple-900/10">
      <div className="px-[15px] pt-4 pb-3">
        {/* Full width row: Title + Wallet on left, Actions on far right */}
        <div className="flex items-center justify-between">
          {/* Left side: Title + Wallet */}
          <div className="flex items-center gap-4">
            {/* Mobile only: wallet icon instead of title */}
            <div className="md:hidden w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              style={{ boxShadow: "0 3px 0 hsl(var(--border))" }}
              aria-label={t("shop.title")}
              title={t("shop.title")}
            >
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* md+: keep title text */}
            <h1 className="hidden md:block text-xl font-display font-bold text-foreground uppercase tracking-wide">
              {t("shop.title")}
            </h1>
            
            {/* Wallet - Coins & Gems */}
            <div className="flex items-center gap-3">
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
          </div>

          <div className="flex items-center gap-2">
            <HeaderActions />
            
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
        </div>
      </div>
    </div>
  );
}