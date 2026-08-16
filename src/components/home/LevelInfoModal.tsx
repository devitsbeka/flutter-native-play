import { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LevelInfo } from "@/utils/levelCalculation";
import { REWARDS } from "@/config/rewardConfig";
import { useLanguage } from "@/contexts/LanguageContext";

// 3D icons from the Figma level modal
import iconGift from "@/assets/level/gift.png";
import iconXpSpark from "@/assets/level/xp-spark.png";
import iconPowerBottle from "@/assets/level/power-bottle.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { SunsetButton } from "@/components/shared/SunsetButton";

interface LevelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelInfo: LevelInfo;
  onContinue?: () => void;
}

const innerCardStyle = {
  background: "#F5FAFF",
  border: "1.5px solid #D63A9C",
};

export function LevelInfoModal({ isOpen, onClose, levelInfo, onContinue }: LevelInfoModalProps) {
  const { t } = useLanguage();

  // Escape dismisses the modal, same as backdrop click
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Only what a level-up actually credits (see MatchResultScreen /
  // CategoryQuizPage): fixed coins and one random power-up
  const rewardItems: { icon: string; label: string }[] = [
    { icon: coinIcon, label: `${REWARDS.LEVEL_UP_COINS} ${t("modals.coin")}` },
    { icon: iconPowerBottle, label: `1 ${t("modals.randomPower")}` },
  ];

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 safe-screen z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-5"
            style={{ boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)" }}
          >
            {/* Close — same treatment as the other home modals. Tapping the
                backdrop already dismisses, but that is not discoverable and
                is unreachable on a phone where the sheet fills the screen.

                The card is its own scroller, so the button rides a
                zero-height sticky strip: absolute alone would scroll off the
                top on a short screen, which is exactly where the sheet is
                tall enough to need it. */}
            <div className="sticky top-0 z-10 h-0">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                style={{ boxShadow: "0 2px 0 #E5E7EB" }}
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            {/* Title + total XP — padded clear of the close button, which the
                centred title would otherwise run under. */}
            <h2 className="px-11 text-center font-display text-2xl font-bold text-[#6D28D9]">
              {t("modals.levelLabel")} {levelInfo.level}
            </h2>
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              <img src={iconXpSpark} alt="" width={22} height={22} className="shrink-0" />
              <span className="text-base font-bold text-[#1E1B2E]">
                {levelInfo.currentXP.toLocaleString()} <span className="font-semibold">XP</span>
              </span>
            </div>

            {/* XP progress card */}
            <div className="mt-4 rounded-[24px] p-5" style={innerCardStyle}>
              <h3 className="font-display text-lg font-bold text-[#1E1B2E]">
                {t("modals.xpProgress")}
              </h3>
              <p className="mt-0.5 text-sm font-semibold text-[#402666]">
                {levelInfo.xpInCurrentLevel}/{levelInfo.xpNeededForNextLevel}
              </p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className="h-full rounded-full bg-[#4A7DDF]"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {levelInfo.isMaxLevel ? (
                  t("modals.maxLevelReached")
                ) : (
                  <>
                    {t("modals.xpToNextLevel", {
                      amount: levelInfo.xpNeededForNextLevel - levelInfo.xpInCurrentLevel,
                    })}
                  </>
                )}
              </p>
            </div>

            {/* Next level rewards card */}
            {!levelInfo.isMaxLevel && (
              <div className="mt-4 rounded-[24px] p-5" style={innerCardStyle}>
                <div className="flex items-center gap-3">
                  <img src={iconGift} alt="" width={44} height={44} className="shrink-0" />
                  <div>
                    <p className="font-display text-2xl font-bold leading-none text-[#1E1B2E]">
                      {t("modals.levelLabel")} {levelInfo.level + 1}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{t("modals.nextLevelRewardsHint")}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3">
                  {rewardItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <img src={item.icon} alt="" width={20} height={20} className="shrink-0" />
                      <span className="text-sm font-medium text-[#1E1B2E]">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue playing */}
            <SunsetButton
              onClick={() => {
                if (onContinue && !levelInfo.isMaxLevel) {
                  onContinue();
                } else {
                  onClose();
                }
              }}
              className="mt-5"
            >
              {t("modals.continueGame")}
            </SunsetButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
