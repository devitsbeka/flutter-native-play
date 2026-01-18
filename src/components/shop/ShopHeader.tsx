import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HeaderActions } from "@/components/shared/HeaderActions";

interface ShopHeaderProps {
  onHelpClick: () => void;
  onCurrencyPlusClick?: (currencyType: "coins" | "gems") => void;
}

export function ShopHeader({ onHelpClick }: ShopHeaderProps) {
  const { t } = useLanguage();

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-purple-900/10">
      <div className="px-4 pt-4 pb-3">
        {/* Top Row: Title + Actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
            {t("shop.title")}
          </h1>

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