import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import brokenHeartIcon from "@/assets/playlimit/broken-heart.png";
import crownDecorIcon from "@/assets/playlimit/crown-decor.png";
import { usePlayLimitClock } from "@/hooks/usePlayLimitClock";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Lock } from "lucide-react";
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
    // For the give-up card below — called unconditionally, ahead of the
    // isGuest branch's early return, though only the non-guest card reads it.
    const giveUpClock = usePlayLimitClock(resetsAt, timeUntilNextPlay);
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

    // Registered non-PRO user — out-of-lives screen (Figma node 1102:4315)
    const card = (
      // A soft lavender wash rather than the flat white card this had
      // before — the Figma reference has no enclosing card at all, its
      // title sits straight on a blurred scene, and a dim modal backdrop
      // behind bare title text would have made it unreadable. This is the
      // closest a card shape gets to that without the scene art itself.
      <div
        className="relative w-full max-w-sm rounded-[28px] p-6 text-center"
        style={{
          background: "linear-gradient(180deg, #F8F6FC 0%, #FFFFFF 60%)",
          boxShadow: "0 12px 32px rgba(102,51,153,0.18)",
        }}
      >
        <h2 className="font-display text-lg font-bold text-[#1E1B2E]">
          {t("playLimit.limitReached")}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t("playLimit.chooseHow")}</p>

        {/* Free first. Nothing else on this card can be had for nothing, and
            burying it under two paid options is what got it reported as
            missing. */}
        <ExtraPlaysOffer section="ad" onPurchased={handlePurchased} />

        {/* Then the subscription — a card of its own, the crown floating
            above it the way the clapperboard spills over the ad card, and
            the CTA in the mint-to-teal gradient the whole screen leads with. */}
        <div
          className="relative mt-8 rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px] border-2 border-white px-4 pb-4 pt-9 text-left"
          style={{
            background: "linear-gradient(135deg, #d1f1e2 0%, #f9ffe2 100%)",
            boxShadow: "0 8px 0 0 #a9c9b4, 0 2px 8px 0 rgba(102,51,153,0.06)",
          }}
        >
          <img
            src={crownDecorIcon}
            alt=""
            className="pointer-events-none absolute -top-7 left-1/2 h-16 w-16 -translate-x-1/2 object-contain"
          />
          <p className="text-center font-display text-base font-extrabold uppercase text-[#161e46]">
            {t("playLimit.proHookTitle")}
          </p>
          <p className="mt-1 text-center text-[13px] leading-tight text-[#1c2c59]">
            {t("playLimit.proHookBody")}
          </p>

          {/* Price and period above the button, so both are read before the
              tap rather than after it. Guideline 3.1.2, and paywallPrice.test
              fails if either goes missing. This is the real, live billing —
              not the design reference's introductory-offer fine print, which
              this screen has no trial wired up to honour. */}
          <p className="mt-4 text-center">
            <span className="font-display text-2xl font-black text-[#1E1B2E]">{proPrice.display}</span>
            <span className="ml-1 text-sm text-slate-500">{monthLabel()}</span>
          </p>

          <motion.button
            onClick={handleUpgradeToPro}
            // Not live while the store has told us nothing — see
            // useProPurchase.storeReady.
            disabled={isProcessing || !storeReady}
            whileTap={{ scale: 0.97, y: 2 }}
            className="mt-3 flex h-14 w-full items-center justify-center rounded-2xl font-display text-base font-bold text-white disabled:opacity-60"
            style={{
              background: "linear-gradient(180deg, #88e2ca 0%, #4accad 58%, #31c3a1 100%)",
              border: "1.5px solid #50d8b8",
              boxShadow: "0 4px 0 0 #1e8e74, inset 0 2px 0 0 rgba(255,255,255,0.45)",
            }}
          >
            {t("playLimit.becomePro")}
          </motion.button>

          {/* The button above starts an auto-renewing subscription, so the
              renewal terms belong beside it — guideline 3.1.2. This card is
              one of the likeliest places a reviewer reaches the paywall from,
              and it had no terms on it at all. */}
          <SubscriptionTerms className="mt-3 text-center" onNavigate={onClose} />
        </div>

        {/* No coins/gems packs here.
            Three offers on one card is one too many: the ad row says watch,
            PRO says stop waiting, and a fourth and fifth way to spend would
            compete with both. Coins and gems still buy plays — from the
            shop, which is where someone who wants to spend is already
            going. */}

        {/* The close button, honestly labelled: not a corner X, a full card
            that says what closing costs — waiting out the clock rather than
            watching an ad or going PRO — the way the rest of this screen
            says what it offers. Tapping it is the only thing it does; the
            backdrop still closes the same way on a tap outside the card. */}
        <button
          type="button"
          onClick={onClose}
          className="relative mt-3 flex w-full items-center gap-3 rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px] border-2 border-[#f6f6f6] bg-[#fedada] p-3 text-left"
          style={{ boxShadow: "0 8px 0 0 #ffbdbd, 0 2px 8px 0 rgba(255,106,106,0.06)" }}
        >
          <img src={brokenHeartIcon} alt="" className="h-12 w-12 shrink-0 object-contain" />
          <span className="min-w-0">
            <span className="block font-display text-base font-extrabold uppercase text-[#6d0a08]">
              {t("playLimit.giveUp")}
            </span>
            {giveUpClock && (
              <span className="mt-0.5 block text-[13px] leading-tight text-[#591c1d]">
                {t("playLimit.giveUpBody", { time: giveUpClock })}
              </span>
            )}
          </span>
        </button>
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
