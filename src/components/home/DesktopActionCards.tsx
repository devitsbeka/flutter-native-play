import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import giftBottleIcon from "@/assets/icons/icon-coin-purse.png";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";
import powersIcon from "@/assets/icons/icon-powers.png";
import adFreeIcon from "@/assets/icons/icon-ad-free.png";
import { useRewardTimers } from "@/hooks/useRewardTimers";
import { useMissions } from "@/hooks/useMissions";
import { useUserPowerUps } from "@/hooks/useUserPowerUps";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useLanguage } from "@/contexts/LanguageContext";

interface DesktopActionCardsProps {
  onDailyRewardsClick: () => void;
  onMissionsClick: () => void;
  onChestClick: () => void;
  onPowersClick: () => void;
  onAdFreeClick: () => void;
  vertical?: boolean;
}

interface ActionCardProps {
  iconSrc: string;
  title: string;
  statusText: string;
  expandedDetails?: string;
  actionLabel?: string;
  onClick: () => void;
  isReady?: boolean;
  badgeCount?: number;
  bgGradient: string;
  particleColor: string;
  delay?: number;
  progressPercent?: number;
  showProgressBar?: boolean;
}

// Sparkle particle component
const Sparkle = ({ delay, x, y, size, color }: { delay: number; x: number; y: number; size: number; color: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      left: `${x}%`,
      top: `${y}%`,
      backgroundColor: color,
    }}
    animate={{
      opacity: [0.2, 0.8, 0.2],
      scale: [0.5, 1.2, 0.5],
    }}
    transition={{
      duration: 2.5 + Math.random(),
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const ActionCard = ({
  iconSrc,
  title,
  statusText,
  expandedDetails,
  actionLabel = "",
  onClick,
  isReady = false,
  badgeCount,
  delay = 0,
  progressPercent,
  showProgressBar = false,
}: ActionCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex flex-col p-4 rounded-2xl overflow-hidden w-[250px] text-left group"
      style={{ 
        background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
        boxShadow: isHovered 
          ? "0 6px 0 #D8D0E8, 0 10px 24px rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,1)"
          : "0 4px 0 #D8D0E8, 0 6px 16px rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,1)",
        border: "2px solid #E8E0F5",
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Main row */}
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="relative flex-shrink-0 z-10">
          <motion.img 
            src={iconSrc} 
            alt={title} 
            className="w-14 h-14 object-contain drop-shadow-md"
            animate={{ y: [0, -3, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Status badge */}
          {isReady && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-white">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </span>
          )}
          {!isReady && badgeCount !== undefined && badgeCount > 0 && (
            <motion.span 
              className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center shadow-lg border-2 border-white"
              style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {badgeCount}
            </motion.span>
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 z-10">
          <p className="text-sm font-bold text-gray-800 truncate">{title}</p>
          <p className="text-xs font-medium text-gray-400 truncate">
            {statusText}
          </p>
          
          {/* Progress bar */}
          {showProgressBar && progressPercent !== undefined && (
            <div className="mt-2 w-full">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    background: "linear-gradient(90deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%)",
                    boxShadow: progressPercent > 50 ? "0 0 8px rgba(139, 92, 246, 0.5)" : "none",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: delay + 0.3 }}
                >
                  {/* Shimmer sweep effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
                  />
                  
                  {/* Sparkle particles on the bar */}
                  {progressPercent > 0 && (
                    <>
                      <motion.div
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{ right: "10%", top: "20%" }}
                        animate={{ 
                          opacity: [0, 1, 0],
                          scale: [0.5, 1.2, 0.5],
                        }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="absolute w-1.5 h-1.5 bg-white rounded-full"
                        style={{ right: "30%", top: "50%" }}
                        animate={{ 
                          opacity: [0, 1, 0],
                          scale: [0.5, 1.5, 0.5],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                      />
                      <motion.div
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{ right: "50%", top: "30%" }}
                        animate={{ 
                          opacity: [0, 1, 0],
                          scale: [0.5, 1, 0.5],
                        }}
                        transition={{ duration: 1, repeat: Infinity, delay: 1 }}
                      />
                    </>
                  )}
                </motion.div>
                
                {/* Glow effect at the end of progress */}
                {progressPercent > 0 && (
                  <motion.div
                    className="absolute top-0 bottom-0 w-3 rounded-full"
                    style={{
                      left: `calc(${progressPercent}% - 6px)`,
                      background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(168,85,247,0.4) 50%, transparent 70%)",
                    }}
                    animate={{ 
                      opacity: [0.5, 1, 0.5],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-left font-medium">
                {progressPercent}%
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden w-full"
          >
            <div className="pt-3 pb-1 mt-3 border-t border-gray-200/60">
              {expandedDetails && (
                <p className="text-xs text-gray-400 mb-3">{expandedDetails}</p>
              )}
              <motion.span
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                style={{ 
                  background: "linear-gradient(180deg, #6EE7B7 0%, #10B981 50%, #059669 100%)",
                  boxShadow: "0 4px 0 #047857, 0 6px 12px rgba(16, 185, 129, 0.3), inset 0 2px 0 rgba(255,255,255,0.3)",
                  border: "2px solid #34D399",
                  color: "#fff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.2)"
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97, y: 2, boxShadow: "0 2px 0 #047857" }}
              >
                {actionLabel}
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export function DesktopActionCards({
  onDailyRewardsClick,
  onMissionsClick,
  onChestClick,
  onPowersClick,
  onAdFreeClick,
  vertical = false,
}: DesktopActionCardsProps) {
  const { canClaimDaily, dailyTimeLeft, canClaimChest, chestTimeLeft } = useRewardTimers();
  const { completedCount, totalCount, overallProgress } = useMissions();
  const { powerUps } = useUserPowerUps();
  const { isVip } = useVipStatus();
  
  const totalPowerUps = Object.values(powerUps).reduce((sum, count) => sum + count, 0);
  const incompleteMissions = totalCount - completedCount;
  const allMissionsDone = incompleteMissions === 0 && totalCount > 0;
  const { t } = useLanguage();

  return (
    <div className={vertical ? "flex flex-col gap-3" : "flex flex-row flex-nowrap justify-center gap-4 overflow-x-auto"}>
      {/* Daily Rewards Card */}
      <ActionCard
        iconSrc={giftBottleIcon}
        title={t("extra.dailyGift")}
        statusText={canClaimDaily ? t("extra.dailyGiftReady") : t("extra.dailyGiftTimeLeft", { time: dailyTimeLeft || "00:00:00" })}
        expandedDetails={t("extra.dailyGiftDetails")}
        actionLabel={canClaimDaily ? t("extra.claimReward") : t("extra.viewDetails")}
        onClick={onDailyRewardsClick}
        isReady={canClaimDaily}
        bgGradient=""
        particleColor=""
        delay={0.1}
      />

      {/* Missions Card */}
      <ActionCard
        iconSrc={missionCrystalIcon}
        title={t("extra.missions")}
        statusText={allMissionsDone ? t("extra.allCompleted") : `${completedCount}/${totalCount}`}
        expandedDetails={t("extra.missionsDetails")}
        actionLabel={t("extra.viewMissions")}
        onClick={onMissionsClick}
        isReady={allMissionsDone}
        badgeCount={incompleteMissions}
        bgGradient=""
        particleColor=""
        delay={0.15}
        progressPercent={overallProgress}
        showProgressBar={!allMissionsDone}
      />

      {/* Chest Card */}
      <ActionCard
        iconSrc={chestBoxIcon}
        title={t("extra.chest")}
        statusText={canClaimChest ? t("extra.chestOpenNow") : t("extra.chestTimeLeft", { time: chestTimeLeft || "00:00:00" })}
        expandedDetails={t("extra.chestDetails")}
        actionLabel={canClaimChest ? t("extra.openChest") : t("extra.viewDetails")}
        onClick={onChestClick}
        isReady={canClaimChest}
        bgGradient=""
        particleColor=""
        delay={0.2}
      />

      {/* Powers Card */}
      <ActionCard
        iconSrc={powersIcon}
        title={t("extra.powers")}
        statusText={totalPowerUps > 0 ? t("extra.powersAvailable", { count: totalPowerUps }) : t("extra.noPowers")}
        expandedDetails={t("extra.powersDetails")}
        actionLabel={t("extra.managePowers")}
        onClick={onPowersClick}
        badgeCount={totalPowerUps}
        bgGradient=""
        particleColor=""
        delay={0.25}
      />

      {/* No-Ads Card - only show if not VIP */}
      {!isVip && (
        <ActionCard
          iconSrc={adFreeIcon}
          title={t("extra.adFree")}
          statusText={t("extra.premiumExperience")}
          expandedDetails={t("extra.adFreeDetails")}
          actionLabel={t("extra.becomeVip")}
          onClick={onAdFreeClick}
          bgGradient=""
          particleColor=""
          delay={0.3}
        />
      )}
    </div>
  );
}
