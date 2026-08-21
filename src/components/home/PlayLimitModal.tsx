import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import crownIcon from "@/assets/crown-icon.png";
import hourglassIcon from "@/assets/playlimit/hourglass.png";
import gamepadIcon from "@/assets/playlimit/gamepad.png";
import wheelIcon from "@/assets/playlimit/wheel.png";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Lock, X } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import { ExtraPlaysOffer } from "@/components/home/ExtraPlaysOffer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useProPurchase } from "@/hooks/useProPurchase";

interface PlayLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister?: () => void;
  isGuest?: boolean;
  inline?: boolean;
  // Regen props for registered non-PRO users
  regenPlayAvailable?: boolean;
  timeUntilNextPlay?: string | null;
  onPlayWithRegen?: () => void;
  /**
   * A pack of extra games was bought and the player can start one now. Where
   * the modal interrupted a game that was about to begin, this is where it
   * carries on; callers that only ever opened it as a notice can leave it
   * unset and the modal just closes.
   */
  onPurchased?: () => void;
}

export const PlayLimitModal = React.forwardRef<HTMLDivElement, PlayLimitModalProps>(
  function PlayLimitModal({ isOpen, onClose, onRegister, isGuest = false, inline, regenPlayAvailable, timeUntilNextPlay, onPlayWithRegen, onPurchased }, ref) {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { initiateProCheckout, isProcessing } = useProPurchase();
    const guestProgress = getGuestProgress();
    
    // Calculate stats for guests
    let totalLevels = 0;
    let totalStars = 0;
    
    Object.values(guestProgress).forEach((cat) => {
      totalLevels += cat.completedLevels.length;
      totalStars += cat.completedLevels.reduce((sum, l) => sum + l.stars_earned, 0);
    });

    // Straight into the purchase, not a tour of the PRO tab: on web this
    // starts Stripe checkout, on the app the native purchase sheet. The
    // profile page stays the fallback only when the checkout cannot start.
    const handleUpgradeToPro = async () => {
      if (isProcessing) return;
      const { success } = await initiateProCheckout("pro");
      if (success) {
        onClose();
      } else {
        onClose();
        navigate("/profile?tab=PRO");
      }
    };

    // The buyer owns what happens next — starting the game they were stopped
    // from, usually — so closing is left to them where they said so.
    const handlePurchased = () => {
      if (onPurchased) onPurchased();
      else onClose();
    };

    // Guest modal content
    if (isGuest) {
      return (
        <div ref={ref}>
          <GameModal
            isOpen={isOpen}
            onClose={onClose}
            variant="primary"
            iconSrc={triviaBuzzer}
            title={t("modals.likedIt")}
            showSparkles
            showStars
            inline={inline}
            fullScreen={false}
          >
            {/* Benefits list */}
            <div className="space-y-2 mb-4">
              <motion.div 
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: "linear-gradient(180deg, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.05) 100%)",
                  border: "2px solid rgba(168,85,247,0.3)",
                  boxShadow: "0 3px 0 rgba(168,85,247,0.15)",
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground">{t("modals.createAnimatedAvatar")}</p>
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: "linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)",
                  border: "2px solid rgba(34,197,94,0.3)",
                  boxShadow: "0 3px 0 rgba(34,197,94,0.15)",
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Trophy className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm font-medium text-foreground">{t("modals.saveProgress")}</p>
              </motion.div>

              <motion.div 
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: "linear-gradient(180deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)",
                  border: "2px solid rgba(59,130,246,0.3)",
                  boxShadow: "0 3px 0 rgba(59,130,246,0.15)",
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Lock className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="text-sm font-medium text-foreground">{t("modals.unlockAllFeatures")}</p>
              </motion.div>
            </div>

            <GameModalFooter
              primaryLabel={t("common.letsGo")}
              onPrimary={onRegister}
              primaryIcon={<Sparkles className="w-5 h-5" />}
            />
          </GameModal>
        </div>
      );
    }

    // Registered non-PRO user — PRO upsell (Figma node 621-7033)
    const card = (
      <div
        className="relative w-full max-w-sm rounded-[24px] bg-white p-6 text-center"
        style={{ boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)" }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
          style={{ boxShadow: "0 2px 0 #E5E7EB" }}
          aria-label="close"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>

        <img src={hourglassIcon} alt="" className="mx-auto h-16 w-16 object-contain" />

        <h2 className="mt-4 font-display text-xl font-bold text-[#1E1B2E]">
          {t("playLimit.limitReached")}
        </h2>
        <p className="mx-auto mt-2 max-w-[300px] text-sm text-slate-500">
          {timeUntilNextPlay
            ? t("playLimit.nextFreePlay", { time: timeUntilNextPlay })
            : t("playLimit.freePlayInterval")}
        </p>

        {/* Paying for the next game or three comes first: it is the only
            answer here that ends with the player back in a game right now.
            The offer takes itself off the card when there is nothing it can
            sell, leaving the PRO route below it as it was. */}
        <ExtraPlaysOffer onPurchased={handlePurchased} />

        <div className="mt-5 space-y-3 text-left">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: "#F5F8FF", border: "1.5px solid #C9D9F5" }}
          >
            <img src={gamepadIcon} alt="" className="h-9 w-9 shrink-0 object-contain" />
            <p className="font-display text-base font-bold text-[#1E1B2E]">
              {t("playLimit.unlimitedGames")}
            </p>
          </div>

          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: "#FBF5FF", border: "1.5px solid #E9B5EE" }}
          >
            <img src={wheelIcon} alt="" className="h-9 w-9 shrink-0 object-contain" />
            <p className="font-display text-base font-bold text-[#1E1B2E]">
              {t("playLimit.exclusiveFeatures")}
            </p>
          </div>
        </div>

        <motion.button
          onClick={handleUpgradeToPro}
          disabled={isProcessing}
          whileTap={{ scale: 0.97, y: 2 }}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-display text-base font-bold text-white disabled:opacity-60"
          style={{
            background: "linear-gradient(90deg, #29B36B 0%, #7CC94A 60%, #B7E356 100%)",
            border: "2px solid #34D399",
            boxShadow: "0 4px 0 0 #1F8F55, inset 0 1.5px 0 0 rgba(255,255,255,0.35)",
          }}
        >
          <img src={crownIcon} alt="" className="h-6 w-6 object-contain" />
          {t("playLimit.becomePro")}
        </motion.button>
      </div>
    );

    if (inline) {
      return <div ref={ref}>{card}</div>;
    }

    return (
      <div ref={ref}>
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))] backdrop-blur-[2px]"
              onClick={onClose}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm"
              >
                {card}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

PlayLimitModal.displayName = "PlayLimitModal";
