import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import crownIcon from "@/assets/crown-icon.png";
import hourglassIcon from "@/assets/playlimit/hourglass.png";
import { PlayLimitCountdown } from "@/components/home/PlayLimitCountdown";
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
import { useStorePrice } from "@/hooks/useStorePrice";
import { monthLabel } from "@/utils/currency";
import { PRICES } from "@/config/pricing";
import { SubscriptionTerms } from "@/components/shared/SubscriptionTerms";

interface PlayLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister?: () => void;
  isGuest?: boolean;
  inline?: boolean;
  // Regen props for registered non-PRO users
  regenPlayAvailable?: boolean;
  timeUntilNextPlay?: string | null;
  /** When the window rolls over, for the countdown. */
  resetsAt?: number | null;
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
  function PlayLimitModal({ isOpen, onClose, onRegister, isGuest = false, inline, regenPlayAvailable, timeUntilNextPlay, resetsAt, onPlayWithRegen, onPurchased }, ref) {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { initiateProCheckout, isProcessing, storeReady } = useProPurchase();
    // "Become PRO" below goes straight to the App Store payment sheet on iOS,
    // so what it costs and how often it renews have to be on the screen before
    // the tap (guideline 3.1.2). This card printed neither — art, a limit
    // message, two benefit rows, a green button, and the renewal terms with no
    // figure anywhere in them.
    //
    // Same resolver and same shape as ProRequiredModal: StoreKit's own
    // localized string on a phone, the table price on the web, and a "—"
    // placeholder while the store is silent — which is also when `storeReady`
    // holds the button closed, so a price is never missing from a live button.
    const storePrice = useStorePrice();
    const proPrice = storePrice("pro", PRICES.pro_monthly.USD, "pro_monthly");
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

        {/* The clock leads, because it is the only thing on this card that is
            good news: the wait is finite and already running. The old layout
            put a static "Next free play: 21m" in grey under the title, where
            it read as a closed door and made the two offers below it look
            like a toll rather than a choice. */}
        <img src={hourglassIcon} alt="" className="mx-auto h-11 w-11 object-contain" />

        <PlayLimitCountdown
          resetsAt={resetsAt}
          fallback={timeUntilNextPlay}
          label={t("playLimit.countdownLabel")}
        />

        <h2 className="mt-4 font-display text-lg font-bold text-[#1E1B2E]">
          {t("playLimit.limitReached")}
        </h2>

        {/* Free first. Nothing else on this card can be had for nothing, and
            burying it under two paid options is what got it reported as
            missing. */}
        <ExtraPlaysOffer section="ad" onPurchased={handlePurchased} />

        {/* Then the subscription, in its own panel rather than as two feature
            rows and a loose price. The hook is what it removes — the wait and
            the ads — not a list of what it adds. */}
        <div
          className="mt-3 rounded-2xl px-4 py-4 text-left"
          style={{
            background: "linear-gradient(180deg, #FBF5FF 0%, #F4ECFF 100%)",
            border: "1.5px solid #E9B5EE",
          }}
        >
          <div className="flex items-center gap-3">
            <img src={gamepadIcon} alt="" className="h-10 w-10 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-bold leading-tight text-[#1E1B2E]">
                {t("playLimit.proHookTitle")}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-tight text-slate-600">
                {t("playLimit.proHookBody")}
              </p>
            </div>
            <img src={wheelIcon} alt="" className="h-9 w-9 shrink-0 object-contain opacity-90" />
          </div>

          {/* Price and period above the button, so both are read before the
              tap rather than after it. Guideline 3.1.2, and paywallPrice.test
              fails if either goes missing. */}
          <p className="mt-3 text-center">
            <span className="font-display text-2xl font-black text-[#1E1B2E]">{proPrice.display}</span>
            <span className="ml-1 text-sm text-slate-500">{monthLabel()}</span>
          </p>

        <motion.button
          onClick={handleUpgradeToPro}
          // Not live while the store has told us nothing — see
          // useProPurchase.storeReady.
          disabled={isProcessing || !storeReady}
          whileTap={{ scale: 0.97, y: 2 }}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-display text-base font-bold text-white disabled:opacity-60"
          style={{
            background: "linear-gradient(90deg, #29B36B 0%, #7CC94A 60%, #B7E356 100%)",
            border: "2px solid #34D399",
            boxShadow: "0 4px 0 0 #1F8F55, inset 0 1.5px 0 0 rgba(255,255,255,0.35)",
          }}
        >
          <img src={crownIcon} alt="" className="h-6 w-6 object-contain" />
          {t("playLimit.becomePro")}
        </motion.button>

          {/* The button above starts an auto-renewing subscription, so the
              renewal terms belong beside it — guideline 3.1.2. This card is
              one of the likeliest places a reviewer reaches the paywall from,
              and it had no terms on it at all. */}
          <SubscriptionTerms className="mt-3 text-center" onNavigate={onClose} />
        </div>

        {/* Last, and quietest: the shortcuts for someone who would rather
            spend than wait or watch. They were the loudest thing on the card
            and they are the least interesting answer to "I want to play now".
            Hidden entirely when there is nothing to sell. */}
        <ExtraPlaysOffer section="packs" onPurchased={handlePurchased} />
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
