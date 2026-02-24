import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Crown, Star, Zap, Gift, Palette, Ban } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { VIP_BENEFITS } from "@/hooks/useVipStatus";
import { useLanguage } from "@/contexts/LanguageContext";

interface VipActivationSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysRemaining: number;
}

export function VipActivationSuccessModal({
  open,
  onOpenChange,
  daysRemaining,
}: VipActivationSuccessModalProps) {
  const { t } = useLanguage();
  useEffect(() => {
    if (open) {
      // Celebration confetti
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
        colors: ["#FFD700", "#FFA500", "#FF69B4", "#8B5CF6", "#F59E0B"],
        zIndex: 9999,
      });
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
              boxShadow: "0 8px 0 #D97706, 0 12px 30px rgba(0,0,0,0.3)",
            }}
          >
            {/* Decorative top banner */}
            <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-yellow-400/50 to-transparent" />
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            <div className="relative p-6 pt-8 text-center">
              {/* Floating Crown */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mb-4"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Crown className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-amber-800 mb-2">
                {t("extra.vipActivated")}
              </h2>
              <p className="text-amber-700 text-sm mb-6">
                {t("extra.becameProUser", { days: daysRemaining })}
              </p>

              {/* Benefits Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {VIP_BENEFITS.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-white/70 rounded-xl p-3 text-left"
                    style={{ boxShadow: "0 2px 0 rgba(0,0,0,0.1)" }}
                  >
                    <span className="text-xl">{benefit.icon}</span>
                    <p className="text-xs font-bold text-amber-800 mt-1">{benefit.title}</p>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <ChunkyButton
                onClick={handleClose}
                className="w-full"
                style={{
                  background: "linear-gradient(180deg, #F59E0B 0%, #D97706 100%)",
                  boxShadow: "0 4px 0 #B45309",
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t("extra.letsStart")}
              </ChunkyButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
