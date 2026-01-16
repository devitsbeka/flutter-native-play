import { motion } from "framer-motion";
import { Check, Clock, Gift, Target, Package, Zap } from "lucide-react";
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
  subtitle: string;
  onClick: () => void;
  isReady?: boolean;
  badgeCount?: number;
  accentColor: string;
  delay?: number;
}

const ActionCard = ({
  iconSrc,
  title,
  subtitle,
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
    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border hover:bg-accent/5 transition-all duration-200 w-full text-left"
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    {/* Icon */}
    <div className="relative flex-shrink-0">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ 
          background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}25 100%)`,
        }}
      >
        <img src={iconSrc} alt={title} className="w-6 h-6 object-contain" />
      </div>
      {/* Status badge */}
      {isReady && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}
      {!isReady && badgeCount !== undefined && badgeCount > 0 && (
        <span 
          className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
          style={{ backgroundColor: accentColor }}
        >
          {badgeCount}
        </span>
      )}
    </div>

    {/* Text content */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">{title}</p>
      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
    </div>

    {/* Chevron indicator */}
    <div className="flex-shrink-0 text-muted-foreground/50">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
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
    <div className="grid grid-cols-2 gap-2 w-full max-w-[400px]">
      {/* Daily Rewards Card */}
      <ActionCard
        iconSrc={giftBottleIcon}
        title="დღიური საჩუქარი"
        subtitle={canClaimDaily ? "მზად არის!" : dailyTimeLeft || "00:00:00"}
        onClick={onDailyRewardsClick}
        isReady={canClaimDaily}
        accentColor="#F59E0B"
        delay={0.1}
      />

      {/* Missions Card */}
      <ActionCard
        iconSrc={missionCrystalIcon}
        title="მისიები"
        subtitle={allMissionsDone ? "ყველა შესრულებულია ✓" : `${completedCount}/${totalCount} შესრულებული`}
        onClick={onMissionsClick}
        isReady={allMissionsDone}
        badgeCount={incompleteMissions}
        accentColor="#0EA5E9"
        delay={0.15}
      />

      {/* Chest Card */}
      <ActionCard
        iconSrc={chestBoxIcon}
        title="საკეტი"
        subtitle={canClaimChest ? "გახსენი!" : chestTimeLeft || "00:00:00"}
        onClick={onChestClick}
        isReady={canClaimChest}
        accentColor="#22C55E"
        delay={0.2}
      />

      {/* Powers Card */}
      <ActionCard
        iconSrc={powersIcon}
        title="ძალები"
        subtitle={`${totalPowerUps} ხელმისაწვდომია`}
        onClick={onPowersClick}
        badgeCount={totalPowerUps}
        accentColor="#8B5CF6"
        delay={0.25}
      />
    </div>
  );
}
