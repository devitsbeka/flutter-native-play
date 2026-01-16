import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
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
  onClick,
  isReady = false,
  badgeCount,
  bgGradient,
  particleColor,
  delay = 0,
}: ActionCardProps) => {
  // Generate random particles
  const particles = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      size: 3 + Math.random() * 4,
      delay: Math.random() * 2,
    })),
  []);

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      className="relative flex items-center gap-4 p-4 rounded-2xl overflow-hidden w-[250px] text-left group"
      style={{ background: bgGradient }}
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Particle animations */}
      {particles.map((p) => (
        <Sparkle
          key={p.id}
          delay={p.delay}
          x={p.x}
          y={p.y}
          size={p.size}
          color={particleColor}
        />
      ))}

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

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-gray-500/60 group-hover:text-gray-600 transition-colors flex-shrink-0 z-10" strokeWidth={2} />
    </motion.button>
  );
};

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
    <div className="grid grid-cols-2 gap-4">
      {/* Daily Rewards Card */}
      <ActionCard
        iconSrc={giftBottleIcon}
        title="დღიური საჩუქარი"
        description="მიიღე ყოველდღიური ჯილდო"
        statusText={canClaimDaily ? "მზად არის! 🎁" : `დარჩა: ${dailyTimeLeft || "00:00:00"}`}
        onClick={onDailyRewardsClick}
        isReady={canClaimDaily}
        bgGradient="linear-gradient(145deg, #FFF7ED 0%, #FED7AA 50%, #FDBA74 100%)"
        particleColor="rgba(253, 186, 116, 0.6)"
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
        bgGradient="linear-gradient(145deg, #E0F2FE 0%, #BAE6FD 50%, #7DD3FC 100%)"
        particleColor="rgba(125, 211, 252, 0.6)"
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
        bgGradient="linear-gradient(145deg, #DCFCE7 0%, #BBF7D0 50%, #86EFAC 100%)"
        particleColor="rgba(134, 239, 172, 0.6)"
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
        bgGradient="linear-gradient(145deg, #EDE9FE 0%, #DDD6FE 50%, #C4B5FD 100%)"
        particleColor="rgba(196, 181, 253, 0.6)"
        delay={0.25}
      />
    </div>
  );
}
