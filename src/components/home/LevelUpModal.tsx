import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, ChevronLeft } from "lucide-react";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import confetti from "canvas-confetti";

const POWER_UP_ICONS: Record<string, string> = {
  "5050": fiftyFiftyIcon,
  "freeze": freezeIcon,
  "replace": replaceIcon,
  "time-drain": timeDrainIcon,
};

const POWER_UP_TRANSLATION_KEYS: Record<string, string> = {
  "5050": "shop.powerUpNames.fiftyFifty",
  "freeze": "shop.powerUpNames.freeze",
  "replace": "shop.powerUpNames.replace",
  "time-drain": "shop.powerUpNames.timeDrain",
};

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  previousLevel: number;
  awardedPowerUp?: string;
}

// PURELY PRESENTATIONAL - rewards are credited in MatchResultScreen
export function LevelUpModal({ isOpen, onClose, newLevel, previousLevel, awardedPowerUp }: LevelUpModalProps) {
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
          }}
        >
          {/* Fixed Header */}
          <motion.div 
            className="sticky top-0 z-10 flex items-center h-14 px-2 border-b border-gray-200/60"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)",
            }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Back button */}
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </motion.button>
            
            {/* Centered title */}
            <div className="flex-1 text-center px-2">
              <h1 className="font-display text-lg font-bold text-gray-900 truncate">
                {t("modals.levelUp")}
              </h1>
            </div>
            
            {/* Right spacer */}
            <div className="w-10" />
          </motion.div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Level Badge */}
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
              className="relative w-32 h-32 mx-auto flex flex-col items-center justify-center rounded-full mb-4"
              style={{
                background: "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)",
                boxShadow: "0 5px 0 #C4B5FD",
                border: "4px solid #A78BFA",
              }}
            >
              <motion.span
                className="text-6xl font-display font-bold text-purple-600"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.5, stiffness: 200 }}
              >
                {newLevel}
              </motion.span>
              <span className="text-sm font-bold text-purple-500">{t("modals.levelLabel")}</span>
            </motion.div>

            {/* Previous level info */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-gray-500 text-lg font-medium mb-6"
            >
              {t("modals.levelLabel")} {previousLevel} → {t("modals.levelLabel")} {newLevel}
            </motion.p>

            {/* Rewards section - Simplified */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl p-5 w-full max-w-xs"
              style={{
                background: "linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)",
                boxShadow: "0 3px 0 #E5E7EB",
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-lg text-gray-900">{t("modals.rewards")}</span>
              </div>
              <div className="flex justify-center gap-6">
                <div className="text-center flex flex-col items-center min-w-[70px]">
                  <img src={coinIcon} alt="" className="w-10 h-10 object-contain" />
                  <p className="font-bold text-xl text-gray-800 mt-1">+{levelUpCoins}</p>
                  <p className="text-sm font-medium text-gray-500">{t("modals.coin")}</p>
                </div>
                {awardedPowerUp && POWER_UP_ICONS[awardedPowerUp] && (
                  <div className="text-center flex flex-col items-center min-w-[70px]">
                    <img src={POWER_UP_ICONS[awardedPowerUp]} alt={awardedPowerUp} className="w-10 h-10 object-contain" />
                    <p className="font-bold text-xl text-gray-800 mt-1">+1</p>
                    <p className="text-sm font-medium text-gray-500">{t(POWER_UP_TRANSLATION_KEYS[awardedPowerUp])}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Footer Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="sticky bottom-0 px-5 py-4 border-t border-gray-200/60"
            style={{
              background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
            }}
          >
            <ChunkyButton
              onClick={onClose}
              variant="success"
              size="lg"
              className="w-full"
            >
              {t("common.continue")}
            </ChunkyButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
