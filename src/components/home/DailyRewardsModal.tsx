import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Sparkles, Check, Lock, Flame } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
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

// Streak badge component
const StreakBadge = ({ streak }: { streak: number }) => (
  <div className="flex items-center justify-center gap-2 mb-4">
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
      <Flame className="w-5 h-5 text-white" />
      <span className="text-white font-bold text-lg">{streak} დღე</span>
    </div>
  </div>
);

// Day reward card component - larger for 3-column layout
const DayRewardCard = ({
  reward,
  index,
  currentDay,
  claimedToday,
  onClaim,
}: {
  reward: (typeof dailyRewards)[0];
  index: number;
  currentDay: number;
  claimedToday: boolean;
  onClaim: () => void;
}) => {
  const isToday = index === currentDay;
  const isClaimed = index < currentDay || (index === currentDay && claimedToday);
  const isLocked = index > currentDay;
  const isAvailable = isToday && !claimedToday;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={isAvailable ? onClaim : undefined}
      whileHover={isAvailable ? { scale: 1.05 } : {}}
      whileTap={isAvailable ? { scale: 0.95 } : {}}
      className={`
        flex-shrink-0 w-24 rounded-2xl p-3 flex flex-col items-center justify-between snap-center
        transition-all duration-300 relative overflow-hidden
        ${isAvailable ? "cursor-pointer" : ""}
        ${
          isAvailable
            ? "bg-gradient-to-b from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 ring-2 ring-amber-300"
            : isClaimed
            ? "bg-emerald-500/20 border-2 border-emerald-500/30"
            : isLocked
            ? "bg-slate-100 border-2 border-slate-200"
            : "bg-white border-2 border-slate-200"
        }
      `}
    >
      {/* Day label */}
      <span
        className={`text-xs font-bold mb-2 ${
          isAvailable ? "text-white" : isClaimed ? "text-emerald-600" : "text-muted-foreground"
        }`}
      >
        დღე {reward.day}
      </span>

      {/* Reward content */}
      <div className="flex flex-col items-center gap-2">
        {isClaimed ? (
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-6 h-6 text-white" />
          </div>
        ) : isLocked ? (
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Coins */}
            <div className="flex items-center gap-1">
              <img src={coinIcon} alt="coins" className="w-5 h-5" />
              <span className={`text-sm font-bold ${isAvailable ? "text-white" : "text-foreground"}`}>
                {reward.coins}
              </span>
            </div>
            {/* Gems */}
            {reward.gems > 0 && (
              <div className="flex items-center gap-1">
                <img src={gemIcon} alt="gems" className="w-5 h-5" />
                <span className={`text-sm font-bold ${isAvailable ? "text-white" : "text-primary"}`}>
                  +{reward.gems}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status indicator */}
      <div className="mt-2">
        {isAvailable && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xs font-bold text-white bg-white/20 rounded-full px-2 py-0.5"
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
  const [claimedToday, setClaimedToday] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showFlyingGems, setShowFlyingGems] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentDay = Math.min(((currentStreak - 1) % 7), 6); // 0-indexed, max 6

  // Scroll to center the current day when modal opens
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = 96 + 12; // w-24 (96px) + gap-3 (12px)
      const scrollPosition = currentDay * cardWidth - container.offsetWidth / 2 + cardWidth / 2;
      setTimeout(() => {
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, currentDay]);

  const handleClaim = async () => {
    if (claimedToday) return;

    const reward = dailyRewards[currentDay];
    playSound("reward");
    vibrate([50, 30, 50]);
    celebrateClaim();

    // Add rewards
    await addCurrency(reward.coins, reward.gems || 0);

    // Show flying animations
    setShowFlyingCoins(true);
    if (reward.gems > 0) {
      setTimeout(() => setShowFlyingGems(true), 300);
    }

    setClaimedToday(true);

    // Close after animation
    setTimeout(() => {
      setShowFlyingCoins(false);
      setShowFlyingGems(false);
      onClaim?.();
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden mb-20">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 px-6 pt-6 pb-8">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/30 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Title */}
                <div className="text-center pr-8">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Gift className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">დღიური ჯილდოები</h2>
                  </div>
                  <p className="text-white/80 text-sm">შემოდი ყოველდღე და აიღე ჯილდოები!</p>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-6 -mt-4 bg-white">
                {/* Streak Badge */}
                <StreakBadge streak={currentStreak} />

                {/* Rewards - Horizontal scroll with 3 visible */}
                <div
                  ref={scrollContainerRef}
                  className="flex gap-3 overflow-x-auto pb-4 px-1 scrollbar-hide"
                  style={{ scrollSnapType: "x mandatory" }}
                >
                  {dailyRewards.map((reward, index) => (
                    <DayRewardCard
                      key={reward.day}
                      reward={reward}
                      index={index}
                      currentDay={currentDay}
                      claimedToday={claimedToday}
                      onClaim={handleClaim}
                    />
                  ))}
                </div>

                {/* Hint */}
                <p className="text-center text-slate-500 text-xs mt-2">
                  ← გადაფურცლე ყველა დღის სანახავად →
                </p>
              </div>
            </div>
          </motion.div>

          {/* Flying Currency Animations */}
          <FlyingCurrency type="coins" amount={dailyRewards[currentDay].coins} isActive={showFlyingCoins} />
          {dailyRewards[currentDay].gems > 0 && (
            <FlyingCurrency type="gems" amount={dailyRewards[currentDay].gems} isActive={showFlyingGems} />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

export default DailyRewardsModal;