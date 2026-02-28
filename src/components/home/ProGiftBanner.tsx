import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import confettiGunIcon from "@/assets/confetti-gun-2.png";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const PROMO_END_DATE = new Date("2026-02-22T23:59:59");

/** Check if the user is eligible for the promo gift */
export function useProGiftEligibility() {
  const { user } = useAuth();
  const { isVip, loading } = useVipStatus();
  const [eligible, setEligible] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user || loading) {
      setChecking(false);
      return;
    }

    const isExpired = new Date() > PROMO_END_DATE;
    const cacheKey = `beta_pro_gift_claimed_${user.id}`;
    const alreadyClaimed = localStorage.getItem(cacheKey) === "true";

    if (isExpired || alreadyClaimed || isVip) {
      setEligible(false);
      setChecking(false);
      return;
    }

    // Check if user has exhausted all 5 free plays
    const checkPlays = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("games_played")
        .eq("user_id", user.id)
        .maybeSingle();

      setEligible((profile?.games_played ?? 0) >= 5);
      setChecking(false);
    };
    checkPlays();
  }, [user, isVip, loading]);

  return { eligible, loading: loading || checking };
}

interface ProGiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: () => void;
  onDismiss: () => void;
}

export function ProGiftModal({ open, onOpenChange, onClaimed, onDismiss }: ProGiftModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activateVip } = useVipStatus();
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);

  const cacheKey = user ? `beta_pro_gift_claimed_${user.id}` : null;

  const fireConfetti = () => {
    const duration = 1500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#FBBF24", "#A855F7", "#EC4899", "#10B981"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#FBBF24", "#A855F7", "#EC4899", "#10B981"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleClaim = async () => {
    if (!user) {
      toast(t("extra.signInForGift"), { icon: "👑" });
      navigate("/auth");
      return;
    }

    setClaiming(true);
    try {
      const success = await activateVip("10days");
      if (success && cacheKey) {
        localStorage.setItem(cacheKey, "true");
        fireConfetti();
        window.dispatchEvent(new CustomEvent("pro-gift-claimed"));
        setTimeout(() => {
          onOpenChange(false);
          onClaimed();
        }, 800);
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-[340px] sm:max-w-[400px] p-0 border-0 overflow-hidden rounded-3xl"
        style={{
          background: "linear-gradient(135deg, #D946A8 0%, #A855F7 50%, #7C3AED 100%)",
          boxShadow: "0 20px 60px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.2)",
        }}
      >
        <div className="flex flex-col items-center text-center px-6 py-8 gap-5">
          {/* Icon */}
          <motion.img
            src={confettiGunIcon}
            alt=""
            className="w-20 h-20"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
          />

          {/* Title */}
          <motion.h2
            className="text-2xl font-black text-white leading-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            🎉 {t("extra.tenDayPro")}
          </motion.h2>

          {/* Description */}
          <motion.p
            className="text-white/90 text-sm leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {t("extra.proGiftDesc")}
          </motion.p>

          {/* CTA Button */}
          <motion.button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full px-6 py-3.5 rounded-2xl text-base font-bold"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #E9D5FF 100%)",
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
              color: "#7C3AED",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {claiming ? "..." : t("extra.claimGiftEmoji")}
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keep backward compat export name
export function ProGiftBanner() {
  return null;
}
