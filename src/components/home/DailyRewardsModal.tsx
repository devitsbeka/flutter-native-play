import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, Lock, Flame, Clock } from "lucide-react";
import giftBottleIcon from "@/assets/icons/icon-coin-purse.png";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { useRewardTimers, useDailyRewardsClaim } from "@/hooks/useRewardTimers";
import { GameModal } from "@/components/ui/game-modal";
import confetti from "canvas-confetti";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { FlyingCurrency } from "@/components/shared/FlyingCurrency";

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  onClaim?: () => void;
}

const dailyRewards = [
  { day: 1, coins: 50, gems: 0 },
  { day: 2, coins: 75, gems: 0 },
  { day: 3, coins: 100, gems: 1 },
  { day: 4, coins: 125, gems: 0 },
  { day: 5, coins: 150, gems: 2 },
  { day: 6, coins: 200, gems: 0 },
  { day: 7, coins: 300, gems: 5 },
];

const celebrateClaim = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1"],
    zIndex: 9999,
  });
};

// Timer badge component
const TimerBadge = ({ timeLeft }: { timeLeft: string }) => (
  <div 
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
    style={{
      background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
      boxShadow: "0 2px 0 #FCD34D",
    }}
  >
    <Clock className="w-4 h-4 text-amber-600" />
    <span className="text-sm font-bold text-amber-700 font-mono">{timeLeft}</span>
  </div>
);

// Streak badge component
const StreakBadge = ({ streak }: { streak: number }) => (
  <div className="flex items-center justify-center gap-2 mb-4">
    <div 
      className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-full px-4 py-2 flex items-center gap-2"
      style={{ boxShadow: "0 3px 0 #D97706" }}
    >
      <Flame className="w-5 h-5 text-white" />
      <span className="text-white font-bold text-lg">{streak} დღე</span>
    </div>
  </div>
);

// Day reward card component
const DayRewardCard = ({
  reward,
  index,
  currentDay,
  claimedToday,
  canClaim,
  onClaim,
}: {
  reward: (typeof dailyRewards)[0];
  index: number;
  currentDay: number;
  claimedToday: boolean;
  canClaim: boolean;
  onClaim: () => void;
}) => {
  const isToday = index === currentDay;
  const isClaimed = index < currentDay || (index === currentDay && claimedToday);
  const isLocked = index > currentDay;
  const isAvailable = isToday && canClaim && !claimedToday;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={isAvailable ? onClaim : undefined}
      whileHover={isAvailable ? { scale: 1.05 } : {}}
      whileTap={isAvailable ? { scale: 0.95 } : {}}
      className={`
        flex-shrink-0 w-20 rounded-2xl p-3 flex flex-col items-center justify-between snap-center
        transition-all duration-300 relative overflow-hidden
        ${isAvailable ? "cursor-pointer" : ""}
      `}
      style={{
        background: isAvailable 
          ? "linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)"
          : isClaimed 
          ? "linear-gradient(180deg, #D1FAE5 0%, #A7F3D0 100%)"
          : "linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%)",
        boxShadow: isAvailable 
          ? "0 4px 0 #D97706, 0 6px 16px rgba(245, 158, 11, 0.3)"
          : isClaimed
          ? "0 3px 0 #6EE7B7"
          : "0 3px 0 #D1D5DB",
        border: isAvailable ? "2px solid #FDE68A" : "2px solid transparent",
      }}
    >
      {/* Day label */}
      <span
        className={`text-xs font-bold mb-2 ${
          isAvailable ? "text-white" : isClaimed ? "text-emerald-700" : "text-gray-500"
        }`}
      >
        დღე {reward.day}
      </span>

      {/* Reward content */}
      <div className="flex flex-col items-center gap-1.5">
        {isClaimed ? (
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center" style={{ boxShadow: "0 2px 0 #059669" }}>
            <Check className="w-5 h-5 text-white" />
          </div>
        ) : isLocked ? (
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center" style={{ boxShadow: "0 2px 0 #9CA3AF" }}>
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <img src={coinIcon} alt="coins" className="w-4 h-4" />
              <span className={`text-sm font-bold ${isAvailable ? "text-white" : "text-gray-700"}`}>
                {reward.coins}
              </span>
            </div>
            {reward.gems > 0 && (
              <div className="flex items-center gap-1">
                <img src={gemIcon} alt="gems" className="w-4 h-4" />
                <span className={`text-sm font-bold ${isAvailable ? "text-white" : "text-purple-600"}`}>
                  +{reward.gems}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status indicator */}
      <div className="mt-2 h-5">
        {isAvailable && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xs font-bold text-amber-900 bg-white/30 rounded-full px-2 py-0.5"
          >
            აიღე!
          </motion.div>
        )}
      </div>

      {/* Sparkle effect for available */}
      {isAvailable && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Sparkles className="absolute top-1 right-1 w-3 h-3 text-white/60" />
          <Sparkles className="absolute bottom-2 left-1 w-2 h-2 text-white/40" />
        </motion.div>
      )}
    </motion.div>
  );
};

export function DailyRewardsModal({ isOpen, onClose, currentStreak, onClaim }: DailyRewardsModalProps) {
  const { addCurrency } = useCurrency();
  const { playSound, vibrate } = useSound();
  const { canClaimDaily, dailyTimeLeft, refreshTimers } = useRewardTimers();
  const { claimDailyReward } = useDailyRewardsClaim();
  const [claimedToday, setClaimedToday] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showFlyingGems, setShowFlyingGems] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentDay = Math.min(((currentStreak - 1) % 7), 6);

  // Sync claimed state with timer hook
  useEffect(() => {
    setClaimedToday(!canClaimDaily);
  }, [canClaimDaily]);

  // Scroll to center the current day when modal opens
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = 80 + 12; // w-20 (80px) + gap-3 (12px)
      const scrollPosition = currentDay * cardWidth - container.offsetWidth / 2 + cardWidth / 2;
      setTimeout(() => {
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, currentDay]);

  const handleClaim = async () => {
    if (claimedToday || !canClaimDaily) return;

    const reward = dailyRewards[currentDay];
    playSound("reward");
    vibrate([50, 30, 50]);
    celebrateClaim();

    // Mark as claimed in database
    const success = await claimDailyReward();
    if (!success) return;

    await addCurrency(reward.coins, reward.gems || 0);

    setShowFlyingCoins(true);
    if (reward.gems > 0) {
      setTimeout(() => setShowFlyingGems(true), 300);
    }

    setClaimedToday(true);
    refreshTimers();

    setTimeout(() => {
      setShowFlyingCoins(false);
      setShowFlyingGems(false);
      onClaim?.();
      onClose();
    }, 1500);
  };

  // Custom header icon
  const headerIcon = (
    <img src={giftBottleIcon} alt="" className="w-20 h-20 object-contain" />
  );

  return (
    <>
      <GameModal
        isOpen={isOpen}
        onClose={onClose}
        icon={headerIcon}
        title="დღიური ჯილდოები"
        subtitle="შემოდი ყოველდღე და აიღე ჯილდოები!"
        showSparkles
        hideFooter
      >
        {/* Timer or Streak Badge */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <StreakBadge streak={currentStreak} />
          {!canClaimDaily && (
            <TimerBadge timeLeft={dailyTimeLeft} />
          )}
        </div>

        {/* Rewards - Horizontal scroll */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {dailyRewards.map((reward, index) => (
            <DayRewardCard
              key={reward.day}
              reward={reward}
              index={index}
              currentDay={currentDay}
              claimedToday={claimedToday}
              canClaim={canClaimDaily}
              onClaim={handleClaim}
            />
          ))}
        </div>

        {/* Hint */}
        <p className="text-center text-muted-foreground text-xs mt-3">
          ← გადაფურცლე ყველა დღის სანახავად →
        </p>
      </GameModal>

      {/* Flying Currency Animations - outside modal for proper z-index */}
      <AnimatePresence>
        {showFlyingCoins && (
          <FlyingCurrency type="coins" amount={dailyRewards[currentDay].coins} isActive={showFlyingCoins} />
        )}
        {dailyRewards[currentDay].gems > 0 && showFlyingGems && (
          <FlyingCurrency type="gems" amount={dailyRewards[currentDay].gems} isActive={showFlyingGems} />
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyRewardsModal;
