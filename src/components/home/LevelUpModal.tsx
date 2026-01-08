import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "lucide-react";
import { getLevelRewards } from "@/utils/levelCalculation";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { useLanguage } from "@/contexts/LanguageContext";
import upgradeVideo from "@/assets/animations/upgrade.mp4";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  previousLevel: number;
}

// PURELY PRESENTATIONAL - rewards are credited in MatchResultScreen
export function LevelUpModal({ isOpen, onClose, newLevel, previousLevel }: LevelUpModalProps) {
  const { t } = useLanguage();
  const rewards = getLevelRewards(newLevel);

  // Calculate level-up coins and gems for DISPLAY ONLY
  const levelUpCoins = newLevel * REWARDS.LEVEL_UP_COINS_PER_LEVEL;
  const levelUpGems = newLevel >= REWARDS.LEVEL_UP_GEMS_THRESHOLD && newLevel % REWARDS.LEVEL_UP_GEMS_THRESHOLD === 0 
    ? Math.floor(newLevel / REWARDS.LEVEL_UP_GEMS_THRESHOLD) 
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: "#8795EB" }}
        >
          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-6 text-center"
            >
              {t("modals.levelUp")} 🎉
            </motion.h1>

            {/* Animated Video Icon - No shadow/background */}
            <motion.div
              className="relative mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
            >
              <video 
                src={upgradeVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-40 h-40 object-contain"
              />
            </motion.div>

            {/* Level Badge - White elegant design */}
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", delay: 0.5, stiffness: 200 }}
              className="relative w-28 h-28 mx-auto flex flex-col items-center justify-center rounded-full mb-4 bg-white border-4 border-white/50"
              style={{
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            >
              <motion.span
                className="text-5xl font-display font-bold text-[#8795EB]"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.7, stiffness: 200 }}
              >
                {newLevel}
              </motion.span>
              <span className="text-sm font-bold text-[#8795EB]/70">{t("modals.levelLabel")}</span>
            </motion.div>

            {/* Previous level info */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center text-white/90 text-lg font-medium mb-6"
            >
              {t("modals.levelLabel")} {previousLevel} → {t("modals.levelLabel")} {newLevel}
            </motion.p>

            {/* Rewards section - White elegant card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="rounded-2xl p-5 w-full max-w-xs bg-white/95 backdrop-blur-sm"
              style={{
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-[#8795EB]" />
                <span className="font-bold text-lg text-[#8795EB]">{t("modals.rewards")}</span>
              </div>
              <div className="flex justify-center gap-6 flex-wrap">
                <div className="text-center">
                  <img src={coinIcon} alt="" className="w-10 h-10 mx-auto" />
                  <p className="font-bold text-xl text-gray-800">+{levelUpCoins}</p>
                  <p className="text-sm font-medium text-gray-500">{t("modals.coin")}</p>
                </div>
                {levelUpGems > 0 && (
                  <div className="text-center">
                    <img src={gemIcon} alt="" className="w-10 h-10 mx-auto" />
                    <p className="font-bold text-xl text-gray-800">+{levelUpGems}</p>
                    <p className="text-sm font-medium text-gray-500">{t("modals.gem")}</p>
                  </div>
                )}
                <div className="text-center">
                  <span className="text-3xl">👑</span>
                  <p className="font-bold text-xl text-gray-800">+{rewards.xpBonus}</p>
                  <p className="text-sm font-medium text-gray-500">{t("modals.xpBonus")}</p>
                </div>
                {rewards.powerUps > 0 && (
                  <div className="text-center">
                    <span className="text-3xl">⚡</span>
                    <p className="font-bold text-xl text-gray-800">+{rewards.powerUps}</p>
                    <p className="text-sm font-medium text-gray-500">{t("modals.powers")}</p>
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
            className="px-6 pb-8"
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
