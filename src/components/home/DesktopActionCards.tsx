import { motion } from "framer-motion";
import { Check, Clock, ChevronRight } from "lucide-react";
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
}

interface ActionCardProps {
  iconSrc: string;
  title: string;
  description: string;
  statusText: string;
  onClick: () => void;
  isReady?: boolean;
  badgeCount?: number;
  accentColor: string;
  delay?: number;
}

const ActionCard = ({
  iconSrc,
  title,
  description,
  statusText,
  onClick,
  isReady = false,
  badgeCount,
  accentColor,
  delay = 0,
}: ActionCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 300, damping: 25 }}
    onClick={onClick}
    className="flex items-center gap-3 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border/40 hover:border-border/60 hover:bg-card transition-all duration-200 w-full text-left group"
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    {/* Icon with background */}
    <div className="relative flex-shrink-0">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ 
          background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}35 100%)`,
          border: `1px solid ${accentColor}30`,
        }}
      >
        <img src={iconSrc} alt={title} className="w-7 h-7 object-contain" />
      </div>
      {/* Status badge */}
      {isReady && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </span>
      )}
      {!isReady && badgeCount !== undefined && badgeCount > 0 && (
        <span 
          className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shadow-md"
          style={{ backgroundColor: accentColor }}
        >
          {badgeCount}
        </span>
      )}
    </div>

    {/* Text content */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">{title}</p>
      <p className="text-xs text-muted-foreground truncate mb-0.5">{description}</p>
      <p 
        className="text-xs font-medium truncate"
        style={{ color: isReady ? '#22C55E' : accentColor }}
      >
        {statusText}
      </p>
    </div>

    {/* Chevron */}
    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors flex-shrink-0" />
  </motion.button>
);

export function DesktopActionCards({
  onDailyRewardsClick,
  onMissionsClick,
  onChestClick,
  onPowersClick,
}: DesktopActionCardsProps) {
  const { canClaimDaily, dailyTimeLeft, canClaimChest, chestTimeLeft } = useRewardTimers();
  const { completedCount, totalCount } = useMissions();
  const { powerUps } = useUserPowerUps();
  
  const totalPowerUps = Object.values(powerUps).reduce((sum, count) => sum + count, 0);
  const incompleteMissions = totalCount - completedCount;
  const allMissionsDone = incompleteMissions === 0 && totalCount > 0;

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-[440px]">
      {/* Daily Rewards Card */}
      <ActionCard
        iconSrc={giftBottleIcon}
        title="დღიური საჩუქარი"
        description="მიიღე ყოველდღიური ჯილდო"
        statusText={canClaimDaily ? "მზად არის! 🎁" : `დარჩა: ${dailyTimeLeft || "00:00:00"}`}
        onClick={onDailyRewardsClick}
        isReady={canClaimDaily}
        accentColor="#F59E0B"
        delay={0.1}
      />

      {/* Missions Card */}
      <ActionCard
        iconSrc={missionCrystalIcon}
        title="მისიები"
        description="შეასრულე დავალებები"
        statusText={allMissionsDone ? "ყველა შესრულებულია ✓" : `${completedCount}/${totalCount} შესრულებული`}
        onClick={onMissionsClick}
        isReady={allMissionsDone}
        badgeCount={incompleteMissions}
        accentColor="#0EA5E9"
        delay={0.15}
      />

      {/* Chest Card */}
      <ActionCard
        iconSrc={chestBoxIcon}
        title="სკივრი"
        description="გახსენი საიდუმლო სკივრი"
        statusText={canClaimChest ? "გახსენი ახლა! 📦" : `დარჩა: ${chestTimeLeft || "00:00:00"}`}
        onClick={onChestClick}
        isReady={canClaimChest}
        accentColor="#22C55E"
        delay={0.2}
      />

      {/* Powers Card */}
      <ActionCard
        iconSrc={powersIcon}
        title="ძალები"
        description="გამოიყენე თამაშში"
        statusText={totalPowerUps > 0 ? `${totalPowerUps} ხელმისაწვდომია` : "არ გაქვს ძალები"}
        onClick={onPowersClick}
        badgeCount={totalPowerUps}
        accentColor="#8B5CF6"
        delay={0.25}
      />
    </div>
  );
}
