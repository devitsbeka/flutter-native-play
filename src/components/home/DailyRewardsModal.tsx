import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Flame, Check, Lock, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import confetti from "canvas-confetti";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { REWARDS } from "@/config/rewardConfig";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";
import { FlyingCurrency } from "@/components/shared/FlyingCurrency";

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  onClaim?: () => void;
}

// Reward configuration for 7 days
const dailyRewards = [
  { day: 1, coins: 50, xp: 10, icon: "🎁" },
  { day: 2, coins: 75, xp: 15, icon: "🎁" },
  { day: 3, coins: 100, gems: 1, xp: 20, icon: "💎" },
  { day: 4, coins: 125, xp: 25, icon: "🎁" },
  { day: 5, coins: 150, gems: 2, xp: 30, icon: "💎" },
  { day: 6, coins: 200, xp: 40, icon: "🎁" },
  { day: 7, coins: 300, gems: 5, xp: 50, powerUp: true, icon: "🏆" },
];

// Celebrate with confetti
const celebrateClaim = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#A855F7", "#FFD700", "#22C55E", "#3B82F6"],
    zIndex: 9999,
  });
};

// Day reward card component
const DayRewardCard = ({ 
  day, 
  reward, 
  status,
  isToday,
  onClaim,
}: { 
  day: number; 
  reward: typeof dailyRewards[0];
  status: "claimed" | "available" | "locked";
  isToday: boolean;
  onClaim?: () => void;
}) => {
  const isClaimed = status === "claimed";
  const isAvailable = status === "available";
  const isLocked = status === "locked";
  
  return (
    <motion.div
      className={`relative flex flex-col items-center p-2.5 rounded-xl transition-all ${
        isToday ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
      style={{
        background: isClaimed 
          ? "linear-gradient(180deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.1) 100%)"
          : isAvailable 
            ? "linear-gradient(180deg, rgba(168,85,247,0.2) 0%, rgba(168,85,247,0.1) 100%)"
            : "linear-gradient(180deg, rgba(156,163,175,0.15) 0%, rgba(156,163,175,0.05) 100%)",
        boxShadow: isAvailable 
          ? "0 4px 0 rgba(168,85,247,0.3), inset 0 1px 2px rgba(255,255,255,0.5)"
          : isClaimed 
            ? "0 4px 0 rgba(34,197,94,0.3)"
            : "0 3px 0 rgba(156,163,175,0.2)",
        border: `2px solid ${isClaimed ? "rgba(34,197,94,0.4)" : isAvailable ? "rgba(168,85,247,0.4)" : "rgba(156,163,175,0.2)"}`,
      }}
      whileHover={isAvailable ? { scale: 1.05, y: -2 } : {}}
      whileTap={isAvailable ? { scale: 0.95, y: 2 } : {}}
      onClick={isAvailable ? onClaim : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: day * 0.05 }}
    >
      {/* Today badge */}
      {isToday && (
        <motion.div 
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
          style={{ 
            background: "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
            boxShadow: "0 2px 0 rgba(147,51,234,0.4)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {t("dailyRewards.today")}
        </motion.div>
      )}
      
      {/* Day number */}
      <span className={`text-[10px] font-bold mb-0.5 ${
        isLocked ? "text-muted-foreground" : isClaimed ? "text-green-600" : "text-primary"
      }`}>
        {t("dailyRewards.day", { day })}
      </span>
      
      {/* Reward icon */}
      <div className={`relative text-2xl mb-0.5 ${isLocked ? "grayscale opacity-50" : ""}`}>
        {reward.icon}
        
        {/* Check overlay for claimed */}
        {isClaimed && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-md">
              <Check className="w-3 h-3 text-white" />
            </div>
          </motion.div>
        )}
        
        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Reward value */}
      <div className="flex items-center gap-0.5">
        <img src={iconCoin} alt="" className="w-3.5 h-3.5" />
        <span className={`text-xs font-bold ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>
          {reward.coins}
        </span>
      </div>
      
      {/* Gems indicator if applicable */}
      {reward.gems && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <img src={iconGem} alt="" className="w-3 h-3" />
          <span className={`text-[10px] font-bold ${isLocked ? "text-muted-foreground" : "text-purple-600"}`}>
            +{reward.gems}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export function DailyRewardsModal({ 
  isOpen, 
  onClose, 
  currentStreak,
  onClaim,
}: DailyRewardsModalProps) {
  const { addCurrency } = useCurrency();
  const { playSound, vibrate } = useSound();
  const [claimedToday, setClaimedToday] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showFlyingGems, setShowFlyingGems] = useState(false);
  
  // Calculate which day the user is on (1-7, then resets)
  const currentDay = ((currentStreak - 1) % 7) + 1;
  const todayReward = dailyRewards[currentDay - 1];
  
  const handleClaim = async () => {
    setClaimedToday(true);
    celebrateClaim();
    
    // Play success sound and vibrate
    playSound("reward");
    vibrate([50, 30, 50]);
    
    // Trigger flying currency animations
    setShowFlyingCoins(true);
    if (todayReward.gems) {
      setTimeout(() => setShowFlyingGems(true), 200);
    }
    
    // Credit the coins and gems from today's reward
    await addCurrency(todayReward.coins, todayReward.gems || 0);
    
    onClaim?.();
    
    // Reset flying animations and close
    setTimeout(() => {
      setShowFlyingCoins(false);
      setShowFlyingGems(false);
      onClose();
    }, 1500);
  };

  // Streak indicator component
  const StreakBadge = () => (
    <motion.div 
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full mx-auto"
      style={{
        background: "linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(234,88,12,0.15) 100%)",
        border: "2px solid rgba(249,115,22,0.4)",
        boxShadow: "0 3px 0 rgba(249,115,22,0.2)",
      }}
    >
      <Flame className="w-5 h-5 text-orange-500" />
      <span className="font-bold text-orange-600">
        {t("dailyRewards.daysInRow", { days: currentStreak })}
      </span>
    </motion.div>
  );
  
  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      iconEmoji="🎁"
      title={t("dailyRewards.title")}
      subtitle={t("dailyRewards.subtitle")}
      showSparkles
      showStars
    >
      {/* Streak indicator */}
      <div className="flex justify-center mb-4">
        <StreakBadge />
      </div>
      
      {/* Rewards grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {dailyRewards.map((reward, index) => {
          const day = index + 1;
          let status: "claimed" | "available" | "locked";
          
          if (day < currentDay) {
            status = "claimed";
          } else if (day === currentDay && !claimedToday) {
            status = "available";
          } else if (day === currentDay && claimedToday) {
            status = "claimed";
          } else {
            status = "locked";
          }
          
          return (
            <DayRewardCard
              key={day}
              day={day}
              reward={reward}
              status={status}
              isToday={day === currentDay}
              onClaim={status === "available" ? handleClaim : undefined}
            />
          );
        })}
      </div>
      
      {/* Claim button or message */}
      {!claimedToday && currentDay <= 7 ? (
        <GameModalFooter
          primaryLabel={t("dailyRewards.claimNow")}
          onPrimary={handleClaim}
          primaryIcon={<Sparkles className="w-5 h-5" />}
          primaryVariant="primary"
        />
      ) : (
        <div className="text-center py-2">
          {/* Flying Currency Animations */}
          <FlyingCurrency type="coins" amount={todayReward.coins} isActive={showFlyingCoins} />
          {todayReward.gems && (
            <FlyingCurrency type="gems" amount={todayReward.gems} isActive={showFlyingGems} />
          )}
          <p className="text-gray-500 text-sm">
            {t("dailyRewards.comeBackTomorrow")}
          </p>
        </div>
      )}
    </GameModal>
  );
}
