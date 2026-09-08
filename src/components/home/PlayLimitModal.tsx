import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import brokenHeartIcon from "@/assets/playlimit/broken-heart.png";
import crownDecorIcon from "@/assets/playlimit/crown-decor.png";
import { usePlayLimitClock } from "@/hooks/usePlayLimitClock";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Lock, ArrowLeft } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import { ExtraPlaysOffer } from "@/components/home/ExtraPlaysOffer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useProPurchase } from "@/hooks/useProPurchase";
import { useStorePrice } from "@/hooks/useStorePrice";
import { PRICES } from "@/config/pricing";
import { PRO_PLANS, periodKeyFor } from "@/config/proPlans";
import { useInAppPurchases } from "@/hooks/useInAppPurchases";
import { Capacitor } from "@capacitor/core";
import { SubscriptionTerms } from "@/components/shared/SubscriptionTerms";
import { PlayBackdrop } from "@/components/shared/PlayBackdrop";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";

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
  /**
   * What is being refused.
   *
   * "lives" is the original wall: the free games have run out, so an ad buys
   * one back and the clock says when the next is free. "rooms" is the Pro
   * door on the online page — creating a room and inviting friends are
   * subscriber features, and neither an ad nor waiting will open them, so
   * both of those rows stand down and PRO is the only offer left.
   */
  reason?: "lives" | "rooms";
}

export const PlayLimitModal = React.forwardRef<HTMLDivElement, PlayLimitModalProps>(
  function PlayLimitModal({ isOpen, onClose, onRegister, isGuest = false, inline, regenPlayAvailable, timeUntilNextPlay, resetsAt, onPlayWithRegen, onPurchased, reason = "lives" }, ref) {
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
    // The mock's fine print opens with a free run of days and then a yearly
    // price, and its button offers the trial — so the card sells the plan
    // that actually carries one. Monthly has no introductory offer on either
    // platform, and pointing the button at it while printing the annual
    // plan's promise is the 3.1.2 mismatch this screen exists to avoid.
    const isNative = Capacitor.isNativePlatform();
    const { products } = useInAppPurchases();
    const proPlan =
      PRO_PLANS.find((plan) => plan.id === "annual") ?? PRO_PLANS[0];
    const proPrice = storePrice(proPlan.productId, PRICES[proPlan.priceKey].USD, proPlan.priceKey);
    // The free trial the store will really honour. On a phone only App Store
    // Connect can grant one, so only App Store Connect gets to claim one; on
    // the web the app owns the offer and create-pro-checkout grants it. Same
    // rule, and the same reasoning, as ProPaywallModal.trialDaysFor.
    const trialDays = isNative
      ? products.find((product) => product.productId === proPlan.productId)?.introFreeDays
      : proPlan.trialDays;
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
      const { success } = await initiateProCheckout(
        proPlan.tier,
        isNative ? proPlan.productId : undefined,
        proPlan.months >= 12 ? "year" : "month",
      );
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

    // Registered non-PRO user — out-of-lives screen (Figma node 1102:4315).
    //
    // It is a SCREEN, not a card on a scrim. The first pass at this kept a
    // card shape because the reference "has no enclosing card at all, its
    // title sits straight on a blurred scene", and bare title text over a
    // dimmed modal backdrop would have been unreadable. The scene exists now
    // — PlayBackdrop is the same blob-and-veil the chooser and the lobby
    // stand on — so the card can go and the layout can be the mock's: a title
    // that says what happened, a line saying there is a choice, and the three
    // answers on slabs of their own.
    const card = (
      <div className="mx-auto flex w-full max-w-[500px] flex-col px-[19px] pb-8">
        {/* 1102:4322 — the whole reason the screen exists, said once. */}
        <h2 className="mx-auto mt-[43px] max-w-[340px] text-center font-display text-[38px] font-bold uppercase leading-[43px] tracking-[-1.16px] text-[#402666]">
          {t(reason === "rooms" ? "playLimit.roomsLockedTitle" : "playLimit.limitReached")}
        </h2>
        {/* 1102:4320 — and that there is something to do about it. */}
        <p className="mt-[16px] text-center font-[Nunito] text-[22px] font-normal leading-[26px] tracking-[-0.16px] text-[#1c2c59]">
          {t(reason === "rooms" ? "playLimit.roomsLockedBody" : "playLimit.chooseHow")}
        </p>

        {/* Free first. Nothing else on this screen can be had for nothing, and
            burying it under two paid options is what got it reported as
            missing.

            `empty:hidden`: the offer renders nothing where rewarded ads do not
            exist — on the web, and wherever the legacy quota is still the rule
            — and without this the row's air stayed behind as a gap. */}
        {reason === "lives" && (
          <div className="mt-[34px] empty:hidden">
            <ExtraPlaysOffer section="ad" onPurchased={handlePurchased} />
          </div>
        )}

        {/* Then the subscription — a card of its own, the crown floating
            above it the way the clapperboard spills over the ad card, and
            the CTA in the mint-to-teal gradient the whole screen leads with. */}
        <div
          className="relative mt-[43px] rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px] border-2 border-white px-[31px] pb-[28px] pt-[80px] text-center"
          style={{
            background: "linear-gradient(135deg, #d1f1e2 0%, #f9ffe2 100%)",
            boxShadow: "0 8px 0 0 #a9c9b4, 0 2px 8px 0 rgba(102,51,153,0.06)",
          }}
        >
          <img
            src={crownDecorIcon}
            alt=""
            className="pointer-events-none absolute -top-[42px] left-1/2 h-[107px] w-[107px] -translate-x-1/2 object-contain"
          />
          <p className="text-center font-display text-[20px] font-extrabold uppercase leading-[26px] text-[#161e46]">
            {t("paywall.title")}
          </p>
          <p className="mt-[7px] text-center font-display text-[16px] leading-[20.7px] tracking-[-0.16px] text-[#1c2c59]">
            {t("playLimit.proHookBody")}
          </p>

          <motion.button
            onClick={handleUpgradeToPro}
            // Not live while the store has told us nothing — see
            // useProPurchase.storeReady.
            disabled={isProcessing || !storeReady}
            whileTap={{ scale: 0.99, y: 2 }}
            className="relative mt-[26px] flex h-[63px] w-full items-center justify-center overflow-hidden rounded-[18.39px] font-display text-[18px] font-bold text-white disabled:opacity-60"
            style={{
              background: "linear-gradient(180deg, #88e2ca 0%, #4accad 58%, #31c3a1 100%)",
              border: "1.5px solid #50d8b8",
              boxShadow: "0 4px 0 0 #1e8e74, inset 0 2px 0 0 rgba(255,255,255,0.45)",
            }}
          >
            {t(trialDays ? "paywall.ctaTrial" : "playLimit.becomePro")}
          </motion.button>

          {/* What it costs and how often, in the small line under the button
              — which is where 1102:4328 puts its fine print. Guideline 3.1.2
              asks for both on the SCREEN the tap happens on, not above the
              button in particular, and paywallPrice.test fails if either goes
              missing. It is the real, live billing — not the reference's
              introductory-offer copy, which this screen has no trial wired up
              to honour. */}
          <p className="mx-auto mt-[22px] max-w-[344px] font-display text-[13px] leading-[20px] tracking-[-0.16px] text-[#1c2c59] opacity-80">
            {/* The mock's own sentence — "first N days free, then <price> per
                <period>, cancel any time" — assembled from what the store
                will really charge rather than from the figures typed into the
                reference. Without a trial it is the same sentence minus its
                first clause. Guideline 3.1.2 wants the price and the period
                read before the tap. */}
            {t(trialDays ? "paywall.footnoteTrial" : "paywall.footnote")
              .replace("{days}", String(trialDays ?? 0))
              .replace("{price}", proPrice.display)
              .replace("{period}", t(periodKeyFor(proPlan)))}
          </p>

          {/* The button above starts an auto-renewing subscription, so the
              renewal terms belong beside it — guideline 3.1.2. This card is
              one of the likeliest places a reviewer reaches the paywall from,
              and it had no terms on it at all. */}
          <SubscriptionTerms className="mt-3 text-center" onNavigate={onClose} />
        </div>

        {/* No coins/gems packs here.
            Three offers on one screen is one too many: the ad row says watch,
            PRO says stop waiting, and a fourth and fifth way to spend would
            compete with both. Coins and gems still buy plays — from the
            shop, which is where someone who wants to spend is already
            going. */}

        {/* The close button, honestly labelled: not a corner X, a full card
            that says what closing costs — waiting out the clock rather than
            watching an ad or going PRO — the way the rest of this screen
            says what it offers. */}
        {reason === "lives" && (
        <button
          type="button"
          onClick={onClose}
          className="relative mt-[36px] flex h-[88px] w-full items-center gap-[14px] rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px] border-2 border-[#f6f6f6] bg-[#fedada] pl-[11px] pr-[12px] text-left"
          style={{ boxShadow: "0 8px 0 0 #ffbdbd, 0 2px 8px 0 rgba(255,106,106,0.06)" }}
        >
          <img src={brokenHeartIcon} alt="" className="h-[68px] w-[68px] shrink-0 object-contain" />
          <span className="min-w-0">
            <span className="block font-display text-[20px] font-extrabold uppercase leading-[26px] text-[#6d0a08]">
              {t("playLimit.giveUp")}
            </span>
            {giveUpClock && (
              <span className="mt-[6px] block font-display text-[16px] leading-[20.7px] tracking-[-0.16px] text-[#591c1d]">
                {t("playLimit.giveUpBody", { time: giveUpClock })}
              </span>
            )}
          </span>
        </button>
        )}
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
              {/* 1102:4319: the chooser's own backdrop, blurred — so the wall
                  reads as the screen behind it rather than as a dialog
                  dropped over a dimmed one, and the bare title has something
                  to sit on. */}
              <PlayBackdrop veil={0.41} blur />

              {/* 1102:4937 — the app's header. The arrow is the way out and
                  the wordmark says you have not left. */}
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
                  {/* The width of the pair every other header carries, so the
                      wordmark lands in the middle rather than pushed right by
                      an arrow with nothing opposite it. */}
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
                // phone has to scroll itself or it is frozen solid.
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
