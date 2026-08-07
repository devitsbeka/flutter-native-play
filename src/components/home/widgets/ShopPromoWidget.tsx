import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Gift } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function ShopPromoWidget() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
      whileTap={{ y: 2 }}
      onClick={() => navigate("/power-ups")}
      className="relative overflow-hidden rounded-2xl p-4 cursor-pointer group bg-card border border-border/60"
      style={{
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
      }}
    >
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: "linear-gradient(135deg, hsl(187, 70%, 60% / 0.15) 0%, transparent 60%)",
        }}
      />
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
            {t("extra.shopGifts")}
          </h3>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground group-hover:text-primary transition-colors">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.div>
  );
}
