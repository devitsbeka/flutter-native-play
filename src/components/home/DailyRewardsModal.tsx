import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Flame, Check, Lock, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";
import { ChunkyButton } from "@/components/ui/chunky-button";
import confetti from "canvas-confetti";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";

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

// Sparkle particle for background
const ModalSparkle = ({ index }: { index: number }) => {
  const duration = 2 + Math.random() * 2;
  const delay = Math.random() * 2;
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        background: "radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%)",
      }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

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
      className={`relative flex flex-col items-center p-3 rounded-2xl transition-all ${
        isToday ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        background: isClaimed 
          ? "linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)"
          : isAvailable 
            ? "linear-gradient(180deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%)"
            : "linear-gradient(180deg, rgba(156,163,175,0.1) 0%, rgba(156,163,175,0.05) 100%)",
        boxShadow: isAvailable 
          ? "0 4px 12px rgba(168,85,247,0.2), inset 0 1px 2px rgba(255,255,255,0.5)"
          : "inset 0 1px 2px rgba(255,255,255,0.3)",
        border: `1px solid ${isClaimed ? "rgba(34,197,94,0.3)" : isAvailable ? "rgba(168,85,247,0.3)" : "rgba(156,163,175,0.2)"}`,
      }}
      whileHover={isAvailable ? { scale: 1.05 } : {}}
      whileTap={isAvailable ? { scale: 0.95 } : {}}
      onClick={isAvailable ? onClaim : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: day * 0.05 }}
    >
      {/* Today badge */}
      {isToday && (
        <motion.div 
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%)" }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {t("dailyRewards.today")}
        </motion.div>
      )}
      
      {/* Day number */}
      <span className={`text-[10px] font-semibold mb-1 ${
        isLocked ? "text-gray-400" : isClaimed ? "text-green-600" : "text-primary"
      }`}>
        {t("dailyRewards.day", { day })}
      </span>
      
      {/* Reward icon */}
      <div className={`relative text-3xl mb-1 ${isLocked ? "grayscale opacity-50" : ""}`}>
        {reward.icon}
        
        {/* Check overlay for claimed */}
        {isClaimed && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          </motion.div>
        )}
        
        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Reward value */}
      <div className="flex items-center gap-0.5">
        <img src={iconCoin} alt="" className="w-4 h-4" />
        <span className={`text-xs font-bold ${isLocked ? "text-gray-400" : "text-gray-700"}`}>
          {reward.coins}
        </span>
      </div>
      
      {/* Gems indicator if applicable */}
      {reward.gems && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <img src={iconGem} alt="" className="w-3 h-3" />
          <span className={`text-[10px] font-bold ${isLocked ? "text-gray-400" : "text-purple-600"}`}>
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
  const [claimedToday, setClaimedToday] = useState(false);
  const sparkles = Array.from({ length: 15 }, (_, i) => i);
  
  // Calculate which day the user is on (1-7, then resets)
  const currentDay = ((currentStreak - 1) % 7) + 1;
  
  const handleClaim = () => {
    setClaimedToday(true);
    celebrateClaim();
    onClaim?.();
    
    // Close after celebration
    setTimeout(() => {
      onClose();
    }, 1500);
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,240,255,0.98) 100%)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5)",
          }}
        >
          {/* Background sparkles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {sparkles.map((i) => (
              <ModalSparkle key={i} index={i} />
            ))}
          </div>
          
          {/* Close button */}
          <motion.button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-4 h-4 text-foreground" />
          </motion.button>
          
          {/* Header */}
          <div className="relative pt-6 pb-4 px-6 text-center border-b border-border/30">
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                boxShadow: "0 4px 12px rgba(255,215,0,0.4)",
              }}
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gift className="w-8 h-8 text-white" />
            </motion.div>
            
            <h2 className="font-display text-2xl font-bold text-foreground">
              {t("dailyRewards.title")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("dailyRewards.subtitle")}
            </p>
            
            {/* Streak indicator */}
            <motion.div 
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.1) 100%)",
                border: "1px solid rgba(249,115,22,0.3)",
              }}
            >
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-orange-600">
                {t("dailyRewards.daysInRow", { days: currentStreak })}
              </span>
            </motion.div>
          </div>
          
          {/* Rewards grid */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1">
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
          </div>
          
          {/* Claim button */}
          <div className="px-6 pb-6">
            {!claimedToday && currentDay <= 7 ? (
              <ChunkyButton
                variant="primary"
                size="lg"
                onClick={handleClaim}
                className="w-full"
                icon={<Sparkles className="w-5 h-5" />}
              >
                {t("dailyRewards.claimNow")}
              </ChunkyButton>
            ) : (
              <div className="text-center py-3">
                <p className="text-muted-foreground text-sm">
                  {t("dailyRewards.comeBackTomorrow")}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
