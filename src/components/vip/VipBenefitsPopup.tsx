import { motion, AnimatePresence } from "framer-motion";
import { X, Crown } from "lucide-react";
import { VIP_BENEFITS } from "@/hooks/useVipStatus";

interface VipBenefitsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysRemaining?: number;
  isVip: boolean;
}

export function VipBenefitsPopup({
  open,
  onOpenChange,
  daysRemaining,
  isVip,
}: VipBenefitsPopupProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs rounded-2xl overflow-hidden"
            style={{
              background: isVip
                ? "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)"
                : "linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%)",
              boxShadow: isVip
                ? "0 6px 0 #D97706, 0 10px 25px rgba(0,0,0,0.2)"
                : "0 6px 0 #9CA3AF, 0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2">
                <Crown className={`w-5 h-5 ${isVip ? "text-amber-600" : "text-gray-500"}`} />
                <h3 className={`font-bold ${isVip ? "text-amber-800" : "text-gray-700"}`}>
                  {isVip ? "VIP ბენეფიტები" : "PRO ბენეფიტები"}
                </h3>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-7 h-7 rounded-full bg-white/70 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* VIP Status */}
            {isVip && daysRemaining !== undefined && (
              <div className="mx-4 mb-3 px-3 py-1.5 bg-amber-500/20 rounded-full inline-flex items-center gap-1">
                <span className="text-xs font-bold text-amber-700">
                  ⏳ დარჩა {daysRemaining} დღე
                </span>
              </div>
            )}

            {/* Benefits List */}
            <div className="px-4 pb-4 space-y-2">
              {VIP_BENEFITS.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex items-start gap-3 p-2 rounded-xl bg-white/60"
                >
                  <span className="text-xl flex-shrink-0">{benefit.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isVip ? "text-amber-800" : "text-gray-700"}`}>
                      {benefit.title}
                    </p>
                    <p className={`text-xs ${isVip ? "text-amber-600" : "text-gray-500"}`}>
                      {benefit.description}
                    </p>
                  </div>
                  {isVip && (
                    <span className="text-green-500 text-lg">✓</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
