import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import giftBottleIcon from "@/assets/icons/icon-coin-purse.png";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";
import powersIcon from "@/assets/icons/icon-powers.png";
import { useRewardTimers } from "@/hooks/useRewardTimers";
import { useMissions } from "@/hooks/useMissions";
import { useUserPowerUps } from "@/hooks/useUserPowerUps";

interface DesktopActionCardsProps {
  onDailyRewardsClick: () => void;
  onMissionsClick: () => void;
  onChestClick: () => void;
  onPowersClick: () => void;
  vertical?: boolean;
}

interface ActionCardProps {
  iconSrc: string;
  title: string;
  description: string;
  statusText: string;
  expandedDetails?: string;
  actionLabel?: string;
  onClick: () => void;
  isReady?: boolean;
  badgeCount?: number;
  bgGradient: string;
  particleColor: string;
  delay?: number;
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
  description,
  statusText,
  expandedDetails,
  actionLabel = "გახსნა",
  onClick,
  isReady = false,
  badgeCount,
  delay = 0,
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
          <p className="text-xs text-gray-600/80 truncate mb-1">{description}</p>
          <p className="text-xs font-semibold text-gray-700 truncate">
            {statusText}
          </p>
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
            <div className="pt-3 mt-3 border-t border-gray-200/60">
              {expandedDetails && (
                <p className="text-xs text-gray-600 mb-3">{expandedDetails}</p>
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
  vertical = false,
}: DesktopActionCardsProps) {
  const { canClaimDaily, dailyTimeLeft, canClaimChest, chestTimeLeft } = useRewardTimers();
  const { completedCount, totalCount } = useMissions();
  const { powerUps } = useUserPowerUps();
  
  const totalPowerUps = Object.values(powerUps).reduce((sum, count) => sum + count, 0);
  const incompleteMissions = totalCount - completedCount;
  const allMissionsDone = incompleteMissions === 0 && totalCount > 0;

  return (
    <div className={vertical ? "flex flex-col gap-3" : "flex flex-row flex-nowrap justify-center gap-4 overflow-x-auto"}>
      {/* Daily Rewards Card */}
      <ActionCard
        iconSrc={giftBottleIcon}
        title="დღიური საჩუქარი"
        description="მიიღე ყოველდღიური ჯილდო"
        statusText={canClaimDaily ? "მზად არის! 🎁" : `დარჩა: ${dailyTimeLeft || "00:00:00"}`}
        expandedDetails="ყოველდღიური შესვლით იღებ მონეტებს, გემებს და სპეციალურ ჯილდოებს."
        actionLabel={canClaimDaily ? "აიღე ჯილდო" : "ნახე დეტალები"}
        onClick={onDailyRewardsClick}
        isReady={canClaimDaily}
        bgGradient=""
        particleColor=""
        delay={0.1}
      />

      {/* Missions Card */}
      <ActionCard
        iconSrc={missionCrystalIcon}
        title="მისიები"
        description="შეასრულე დავალებები"
        statusText={allMissionsDone ? "ყველა შესრულებულია ✓" : `${completedCount}/${totalCount} შესრულებული`}
        expandedDetails="დაასრულე დავალებები და მიიღე დამატებითი ჯილდოები."
        actionLabel="ნახე მისიები"
        onClick={onMissionsClick}
        isReady={allMissionsDone}
        badgeCount={incompleteMissions}
        bgGradient=""
        particleColor=""
        delay={0.15}
      />

      {/* Chest Card */}
      <ActionCard
        iconSrc={chestBoxIcon}
        title="სკივრი"
        description="გახსენი საიდუმლო სკივრი"
        statusText={canClaimChest ? "გახსენი ახლა! 📦" : `დარჩა: ${chestTimeLeft || "00:00:00"}`}
        expandedDetails="საიდუმლო სკივრში შეიძლება იყოს იშვიათი ჯილდოები და პაუერ-აფები."
        actionLabel={canClaimChest ? "გახსენი სკივრი" : "ნახე დეტალები"}
        onClick={onChestClick}
        isReady={canClaimChest}
        bgGradient=""
        particleColor=""
        delay={0.2}
      />

      {/* Powers Card */}
      <ActionCard
        iconSrc={powersIcon}
        title="ძალები"
        description="გამოიყენე თამაშში"
        statusText={totalPowerUps > 0 ? `${totalPowerUps} ხელმისაწვდომია` : "არ გაქვს ძალები"}
        expandedDetails="პაუერ-აფები გეხმარება კითხვებზე პასუხის გაცემაში."
        actionLabel="მართე ძალები"
        onClick={onPowersClick}
        badgeCount={totalPowerUps}
        bgGradient=""
        particleColor=""
        delay={0.25}
      />
    </div>
  );
}
