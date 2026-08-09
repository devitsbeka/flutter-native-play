import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "icon_onboarding_tooltip_shown";

export function IconOnboardingTooltip() {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const alreadyShown = localStorage.getItem(STORAGE_KEY);
    if (alreadyShown) return;
    const showTimer = setTimeout(() => setIsVisible(true), 800);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => dismiss(), 4000);
    return () => clearTimeout(timer);
  }, [isVisible]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const handle = () => dismiss();
    document.addEventListener("touchstart", handle, { passive: true });
    document.addEventListener("click", handle);
    return () => {
      document.removeEventListener("touchstart", handle);
      document.removeEventListener("click", handle);
    };
  }, [isVisible, dismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none"
        >
          <div className="relative bg-white text-slate-700 px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200/80 max-w-[min(78vw,290px)]">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-slate-200/80 rotate-45" />
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-violet-500 shrink-0" />
              <span className="text-xs font-semibold">{t("extra.addIconToQuestion")} 🎨</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
