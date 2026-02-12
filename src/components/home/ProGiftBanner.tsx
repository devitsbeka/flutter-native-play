import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import confettiGunIcon from "@/assets/confetti-gun-2.png";

const PROMO_END_DATE = new Date("2026-02-22T23:59:59");

export function ProGiftBanner() {
  const { user } = useAuth();
  const { activateVip } = useVipStatus();
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);

  // Check if promo period is over
  if (new Date() > PROMO_END_DATE) return null;

  // Check if already claimed
  const cacheKey = user ? `beta_pro_gift_claimed_${user.id}` : null;
  if (cacheKey && localStorage.getItem(cacheKey) === "true") return null;

  const handleClaim = async () => {
    if (!user) {
      toast("შედი ანგარიშზე საჩუქრის მისაღებად", { icon: "👑" });
      navigate("/auth");
      return;
    }

    setClaiming(true);
    try {
      const success = await activateVip("10days");
      if (success && cacheKey) {
        localStorage.setItem(cacheKey, "true");
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, type: "spring" }}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-amber-200 w-full max-w-[360px]"
        style={{
          background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)",
          boxShadow: "0 4px 16px rgba(251, 191, 36, 0.25), 0 0 20px rgba(251, 191, 36, 0.1)",
        }}
      >
        <img src={confettiGunIcon} alt="" className="w-7 h-7 flex-shrink-0" />
        <span className="text-sm font-bold text-amber-900 flex-1 leading-tight">
          გილოცავთ, თქვენ გაქვთ PRO 10 დღის განმავლობაში.
        </span>
        <motion.button
          onClick={handleClaim}
          disabled={claiming}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, #FBBF24 0%, #D97706 100%)",
            boxShadow: "0 2px 8px rgba(217, 119, 6, 0.4)",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {claiming ? "..." : "მიიღე"}
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
