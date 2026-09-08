import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import crownRender from "@/assets/playlimit/crown.png";
import brokenHeartRender from "@/assets/playlimit/heart-broken.png";
import { usePlayLimitClock } from "@/components/home/PlayLimitCountdown";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Lock, ArrowLeft } from "lucide-react";
import { PlayBackdrop } from "@/components/shared/PlayBackdrop";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
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
    // The wait, ticking, so the give-up row can say it in a sentence.
    const clock = usePlayLimitClock(resetsAt, timeUntilNextPlay);
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

    // Registered non-PRO user — the wall (Figma 1102:4315).
    //
    // It used to be a small white card in the middle of a dimmed screen: a
    // clock, an ad row, a subscription panel, terms. Everything it says is
    // still here, but the mock gives each of the three answers its own slab
    // and lets them fill the screen — a black one for the ad, which is free,
    // a mint one for PRO, which removes the wall entirely, and a rose one for
    // waiting it out, which is what closing this is.
    const card = (
      <div className="mx-auto flex w-full max-w-[500px] flex-col px-[19px] pb-8">
        {/* 1102:4322 — the whole reason the screen exists, said once. */}
        <h2 className="mx-auto mt-[43px] max-w-[340px] text-center font-display text-[38px] font-bold uppercase leading-[43px] tracking-[-1.16px] text-[#402666]">
          {t("playLimit.outOfLivesTitle")}
        </h2>
        {/* 1102:4320 — and what to do about it, which is the list below. */}
        <p className="mt-[16px] text-center font-[Nunito] text-[22px] font-normal leading-[26px] tracking-[-0.16px] text-[#1c2c59]">
          {t("playLimit.outOfLivesSubtitle")}
        </p>

        {/* Free first. It is the only door on this screen that costs nothing,
            and burying it under a subscription is what got it reported as
            missing the last time this screen was rearranged. */}
        {/* `empty:hidden` because the offer renders nothing where rewarded
            ads do not exist — on the web, and wherever the legacy quota is
            still the rule. Without it the row's 50px of air stayed behind as
            a gap with nothing in it. */}
        <div className="mt-[50px] empty:hidden">
          <ExtraPlaysOffer section="wall" onPurchased={handlePurchased} />
        </div>

        {/* 1102:4323 — PRO, in its own panel with the crown hung over its
            top edge. The hook is what it removes: the wait, and the ads. */}
        <div className="relative mt-[43px]">
          <img
            alt=""
            src={crownRender}
            className="pointer-events-none absolute left-1/2 top-[-42px] z-10 h-[107px] w-[107px] -translate-x-1/2 object-contain"
          />
          <div className="relative rounded-bl-[24px] rounded-br-[54px] rounded-tl-[24px] rounded-tr-[24px] border-2 border-solid border-white bg-[linear-gradient(270deg,#d1f1e2_0%,#f9ffe2_100%)] px-[31px] pb-[33px] pt-[80px] text-center shadow-[0px_2px_8px_0px_rgba(102,51,153,0.06),0px_8px_0px_0px_#a9c9b4]">
            <p className="font-display text-[20px] font-bold uppercase leading-[26px] text-[#161e46]">
              {t("paywall.title")}
            </p>
            <p className="mt-[7px] font-display text-[16px] font-normal leading-[20.7px] tracking-[-0.16px] text-[#1c2c59]">
              {t("playLimit.proHookBody")}
            </p>

            <motion.button
              type="button"
              onClick={handleUpgradeToPro}
              // Not live while the store has told us nothing — see
              // useProPurchase.storeReady.
              disabled={isProcessing || !storeReady}
              whileTap={isProcessing || !storeReady ? undefined : { scale: 0.99 }}
              className="relative mt-[26px] flex h-[63px] w-full items-center justify-center overflow-hidden rounded-[18.39px] border-[1.5px] border-solid border-[#50d8b8] bg-[linear-gradient(180deg,#88e2ca_0%,#4accad_58%,#31c3a1_100%)] shadow-[0px_4px_0px_0px_#1e8e74,0px_8px_16px_0px_rgba(102,51,153,0.3)] transition-[transform,box-shadow] duration-100 active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_#1e8e74,0px_8px_16px_0px_rgba(102,51,153,0.3)] disabled:opacity-60"
            >
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.45)]" />
              <span className="font-display text-[18px] font-bold leading-[26px] text-white">
                {t("playLimit.becomePro")}
              </span>
            </motion.button>

            {/* 1102:4328: what it costs and how often, in the small line
                under the button — guideline 3.1.2 wants both on the screen
                the tap happens on, not in the sheet that follows it. */}
            <p className="mx-auto mt-[22px] max-w-[344px] font-display text-[13px] font-normal leading-[20px] tracking-[-0.16px] text-[#1c2c59] opacity-80">
              {proPrice.display}
              {monthLabel()} · {t("playLimit.cancelAnytime")}
            </p>

            {/* The button above starts an auto-renewing subscription, so the
                renewal terms belong beside it — guideline 3.1.2. */}
            <SubscriptionTerms className="mt-2 text-center" onNavigate={onClose} />
          </div>
        </div>

        {/* 1102:4329 — waiting it out. It is a real answer and the mock gives
            it a row of its own rather than an X in a corner, so the countdown
            has somewhere to be said in words. */}
        <button
          type="button"
          onClick={onClose}
          className="relative mt-[36px] h-[88px] w-full rounded-bl-[24px] rounded-br-[54px] rounded-tl-[24px] rounded-tr-[24px] border-2 border-solid border-[#f6f6f6] bg-[#fedada] text-left shadow-[0px_2px_8px_0px_rgba(255,106,106,0.06),0px_8px_0px_0px_#ffbdbd]"
        >
          <span className="absolute left-[-1px] top-[-2px] block h-[87px] w-[calc(100%+2px)] rounded-bl-[24px] rounded-br-[54px] rounded-tl-[24px] rounded-tr-[24px] border-2 border-solid border-[#ffd9d9] bg-[#ffdede] shadow-[0px_2px_8px_0px_rgba(102,51,153,0.06),0px_8px_0px_0px_#e8b9b9]">
            <img
              alt=""
              src={brokenHeartRender}
              className="pointer-events-none absolute left-[11px] top-[8px] h-[68px] w-[68px] object-contain"
            />
            <span className="absolute left-[93px] right-[12px] top-[9px] block font-display text-[20px] font-bold uppercase leading-[26px] text-[#6d0a08]">
              {t("playLimit.giveUpTitle")}
            </span>
            <span className="absolute left-[93px] right-[12px] top-[45px] block font-display text-[16px] font-normal leading-[20.7px] tracking-[-0.16px] text-[#591c1d]">
              {clock
                ? t("playLimit.giveUpBody", { time: clock })
                : t("playLimit.giveUpBodyUnknown")}
            </span>
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
              className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#f6f1ff] pb-[var(--safe-bottom)] pt-[var(--safe-top)]"
            >
              {/* 1102:4319: the same backdrop the chooser sits on, blurred,
                  so the wall reads as the screen behind it rather than as a
                  dialog dropped over a dimmed one. */}
              <PlayBackdrop veil={0.41} blur />

              {/* The app's own header (1102:4937), so the wall reads as a
                  screen you are standing on rather than a dialog you are
                  trapped in: the arrow is the way out, and the wordmark says
                  you have not left. */}
              <header className="relative z-10 shrink-0 px-4 py-3">
                <div className="mx-auto flex h-[45px] w-full max-w-[500px] items-center justify-between gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    aria-label={t("common.back")}
                    className="rounded-full p-2 transition-colors hover:bg-white/30"
                  >
                    <ArrowLeft className="h-6 w-6 text-[#4b5563]" />
                  </motion.button>
                  <div className="flex min-w-0 flex-1 items-center justify-center">
                    <MyTriviaLiveLogo responsive />
                  </div>
                  {/* The width of the pair the other headers carry, so the
                      wordmark lands in the middle of the screen rather than
                      pushed right by an arrow with nothing opposite it. */}
                  <span aria-hidden className="h-10 w-10 shrink-0" />
                </div>
              </header>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                // Its own scroller: the document does not scroll on the
                // device (see nativeShell.ts), so a screen that outgrows the
                // phone has to scroll itself or it is frozen.
                className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
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
