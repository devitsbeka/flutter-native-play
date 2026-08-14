import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import giftIcon from "@/assets/level/gift.png";
import { GreenPlayButton } from "@/components/shared/GreenPlayButton";
import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { GameModal } from "@/components/ui/game-modal";
import confetti from "canvas-confetti";

const POWER_UP_ICONS: Record<string, string> = {
  "5050": fiftyFiftyIcon,
  "freeze": freezeIcon,
  "replace": replaceIcon,
  "time-drain": timeDrainIcon,
};

/**
 * The two reward icons are drawn at different scales inside their own files:
 * the coin sits in a wide margin of transparent pixels, the power-up hexagons
 * fill their PNGs edge to edge. At the same box size the coin therefore came
 * out a third smaller than the power-up beside it, which is what it looked
 * like — measured in Chromium at the old `h-12` on both:
 *
 *   coin  box 48 -> artwork 31x32
 *   power box 48 -> artwork 48x48
 *
 * So the box is sized from the artwork instead. 71px of coin box draws 48px
 * of coin:
 *
 *   coin  box 71 -> artwork 45x48
 *   power box 48 -> artwork 48x48
 *
 * Both then sit in a slot as tall as the larger box, so the numbers below
 * stay in line and the coin's transparent margin has somewhere to go rather
 * than reaching down into "+150".
 */
const REWARD_ART_PX = 48;
const COIN_BOX_PX = 71;
const REWARD_SLOT_PX = COIN_BOX_PX;

const POWER_UP_TRANSLATION_KEYS: Record<string, string> = {
  "5050": "shop.powerUpNames.fiftyFifty",
  "freeze": "shop.powerUpNames.freeze",
  "replace": "shop.powerUpNames.replace",
  "time-drain": "shop.powerUpNames.timeDrain",
};

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The player's level, as the rest of the app counts it. */
  newLevel: number;
  previousLevel: number;
  awardedPowerUp?: string;
  /**
   * Total correct answers behind this celebration. VS games hand out these
   * rewards every 20 correct answers, which is not the same thing as gaining
   * a level — passing the real figure keeps the line under the badge honest
   * instead of deriving it from the level number.
   */
  correctAnswers?: number;
}

// PURELY PRESENTATIONAL - rewards are credited in MatchResultScreen
export function LevelUpModal({ isOpen, onClose, newLevel, previousLevel, awardedPowerUp, correctAnswers }: LevelUpModalProps) {
  const { t } = useLanguage();
  const confettiTriggered = useRef(false);

  // Fixed reward amounts from config
  const levelUpCoins = REWARDS.LEVEL_UP_COINS;

  // Fire confetti when modal opens
  useEffect(() => {
    if (isOpen && !confettiTriggered.current) {
      confettiTriggered.current = true;

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.3 },
        colors: ["#FFD700", "#FFA500", "#FFFFFF", "#8795EB"],
      });

      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#FFD700", "#FFA500", "#FFFFFF"],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#FFD700", "#FFA500", "#FFFFFF"],
        });
      }, 250);
    }

    if (!isOpen) {
      confettiTriggered.current = false;
    }
  }, [isOpen]);

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={newLevel > previousLevel ? t("modals.levelUp") : t("modals.rewardEarned")}
      showSparkles
      footer={
        <GreenPlayButton onClick={onClose} className="h-14 w-full text-base">
          {t("common.continue")}
        </GreenPlayButton>
      }
    >
      <div className="flex flex-col items-center justify-center py-6">
        {/* Level Badge */}
        <motion.div
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
          className="relative mx-auto mb-4 flex h-32 w-32 flex-col items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)",
            boxShadow: "0 5px 0 #C4B5FD",
            border: "4px solid #A78BFA",
          }}
        >
          <motion.span
            className="font-display text-6xl font-bold text-purple-600"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.5, stiffness: 200 }}
          >
            {newLevel}
          </motion.span>
          <span className="text-sm font-bold text-purple-500">{t("modals.levelLabel")}</span>
        </motion.div>

        {/* Correct-answers milestone */}
        {correctAnswers !== undefined && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6 text-center text-lg font-medium text-gray-500"
          >
            {correctAnswers} {t("modals.correctAnswers")}
          </motion.p>
        )}

        {/* Rewards card — the shared lavender card recipe */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-xs rounded-[24px] p-5"
          style={{
            background: "rgba(252,247,255,0.8)",
            border: "1.5px solid #e8e0f5",
            boxShadow: "0 3.6px 0 0 #d8d0e8, inset 0 1.8px 0 0 #fff",
          }}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <img src={giftIcon} alt="" className="h-7 w-7 object-contain" />
            <span className="text-lg font-bold text-[#402666]">{t("modals.rewards")}</span>
          </div>
          <div className="flex justify-center gap-6">
            <div className="flex min-w-[70px] flex-col items-center text-center">
              <span className="flex items-center justify-center" style={{ height: REWARD_SLOT_PX }}>
                <img
                  src={coinIcon}
                  alt=""
                  className="max-w-none object-contain"
                  style={{ width: COIN_BOX_PX, height: COIN_BOX_PX }}
                />
              </span>
              <p className="mt-1 text-xl font-bold text-gray-800">+{levelUpCoins}</p>
              <p className="text-sm font-medium text-gray-500">{t("modals.coin")}</p>
            </div>
            {awardedPowerUp && POWER_UP_ICONS[awardedPowerUp] && (
              <div className="flex min-w-[70px] flex-col items-center text-center">
                <span className="flex items-center justify-center" style={{ height: REWARD_SLOT_PX }}>
                  <img
                    src={POWER_UP_ICONS[awardedPowerUp]}
                    alt={awardedPowerUp}
                    className="object-contain"
                    style={{ width: REWARD_ART_PX, height: REWARD_ART_PX }}
                  />
                </span>
                <p className="mt-1 text-xl font-bold text-gray-800">+1</p>
                <p className="text-sm font-medium text-gray-500">{t(POWER_UP_TRANSLATION_KEYS[awardedPowerUp])}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </GameModal>
  );
}
