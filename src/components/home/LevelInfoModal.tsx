import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LevelInfo, getLevelRewards } from "@/utils/levelCalculation";
import { useLanguage } from "@/contexts/LanguageContext";

// 3D icons from the Figma level modal
import iconGift from "@/assets/level/gift.png";
import iconXpSpark from "@/assets/level/xp-spark.png";
import iconPowerBottle from "@/assets/level/power-bottle.png";
import iconCrown from "@/assets/level/crown.png";
import iconFrame from "@/assets/level/frame.png";

interface LevelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelInfo: LevelInfo;
  onContinue?: () => void;
}

// Icon for a special-reward line: avatars get the picture frame, status/VIP
// rewards the crown, everything else the sparkle
function specialRewardIcon(label: string): string {
  if (label.includes("ავატარ")) return iconFrame;
  if (label.includes("VIP") || label.includes("PRO") || label.includes("სტატუსი")) return iconCrown;
  return iconXpSpark;
}

const innerCardStyle = {
  background: "#F5FAFF",
  border: "1.5px solid #D63A9C",
};

export function LevelInfoModal({ isOpen, onClose, levelInfo, onContinue }: LevelInfoModalProps) {
  const { t } = useLanguage();
  const nextLevelRewards = getLevelRewards(levelInfo.level + 1);

  // Escape dismisses the modal, same as backdrop click
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Reward rows for the 2-column grid, each with its Figma icon
  const rewardItems: { icon: string; label: string }[] = [
    { icon: iconXpSpark, label: `${nextLevelRewards.xpBonus} XP ${t("modals.xpBonus")}` },
  ];
  if (nextLevelRewards.powerUps > 0) {
    rewardItems.push({ icon: iconPowerBottle, label: `${nextLevelRewards.powerUps} ${t("modals.powers")}` });
  }
  if (nextLevelRewards.spinTickets > 0) {
    rewardItems.push({ icon: iconGift, label: `${nextLevelRewards.spinTickets} ${t("modals.spinTickets")}` });
  }
  for (const special of nextLevelRewards.specialRewards) {
    rewardItems.push({ icon: specialRewardIcon(special), label: special });
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-5"
            style={{ boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)" }}
          >
            {/* Title + total XP */}
            <h2 className="text-center font-display text-2xl font-bold text-[#6D28D9]">
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
                      {levelInfo.level + 1}
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
            <motion.button
              onClick={() => {
                if (onContinue && !levelInfo.isMaxLevel) {
                  onContinue();
                } else {
                  onClose();
                }
              }}
              whileTap={{ scale: 0.97, y: 2 }}
              className="mt-5 h-12 w-full rounded-full font-display text-base font-bold text-white"
              style={{
                background: "linear-gradient(90deg, #F25CA2 0%, #FF9A3D 100%)",
                border: "2px solid #FBB1D0",
                boxShadow: "0 4px 0 0 #D6427F, inset 0 1.5px 0 0 rgba(255,255,255,0.4)",
              }}
            >
              {t("modals.continueGame")}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
