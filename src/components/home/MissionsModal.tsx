import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy, Clock, Sparkles, Gift, Check } from "lucide-react";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import { useMissions, getMissionTheme } from "@/hooks/useMissions";
import { useSound } from "@/contexts/SoundContext";
import { GameModal } from "@/components/ui/game-modal";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { useFlyingCurrency } from "@/components/shared/FlyingCurrency";
import { toast } from "@/hooks/use-toast";

// Power-up icons
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import powerTimeDrain from "@/assets/powers/time-drain.png";

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POWER_UP_ICONS: Record<string, string> = {
  "5050": power5050,
  "freeze": powerFreeze,
  "replace": powerReplace,
  "time-drain": powerTimeDrain,
};

const POWER_UP_NAMES: Record<string, string> = {
  "5050": "50/50",
  "freeze": "გაყინვა",
  "replace": "ჩანაცვლება",
  "time-drain": "დროის გამოწვა",
};

const celebrateClaim = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#FFD700", "#10B981", "#8B5CF6", "#EC4899", "#3B82F6"],
    zIndex: 9999,
  });
};

// Calculate time until midnight for mission reset
const getTimeUntilMidnight = (): string => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

// Mission card icons based on mission type
const getMissionIcon = (missionId: string) => {
  switch (missionId) {
    case "win_games":
      return "🏆";
    case "answer_correct":
      return "✅";
    case "play_categories":
      return "🎯";
    case "play_games":
      return "🎮";
    case "perfect_round":
      return "⭐";
    default:
      return "🎲";
  }
};

export function MissionsModal({ isOpen, onClose }: MissionsModalProps) {
  const { missions, loading, claimMissionReward, unclaimedCount } = useMissions();
  const { playSound } = useSound();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { triggerFlyingCurrency, FlyingCurrencyComponent } = useFlyingCurrency();

  const completedCount = missions.filter((m) => m.completed).length;
  const claimedCount = missions.filter((m) => m.reward_claimed).length;
  
  // Calculate total potential rewards
  const totalRewards = missions.reduce(
    (acc, m) => ({
      coins: acc.coins + m.reward_coins,
      gems: acc.gems + m.reward_gems,
      xp: acc.xp + m.reward_xp,
    }),
    { coins: 0, gems: 0, xp: 0 }
  );

  const handleClaimMission = async (missionId: string) => {
    setClaimingId(missionId);
    playSound("reward");
    
    const result = await claimMissionReward(missionId);
    
    if (result.success) {
      celebrateClaim();
      
      // Trigger flying currency animations
      if (result.coins > 0) {
        triggerFlyingCurrency("coins", Math.min(result.coins / 10, 10));
      }
      if (result.gems > 0) {
        triggerFlyingCurrency("gems", result.gems);
      }
      
      // Show toast with rewards
      const rewardParts = [];
      if (result.coins > 0) rewardParts.push(`${result.coins} მონეტა`);
      if (result.gems > 0) rewardParts.push(`${result.gems} ლალი`);
      if (result.xp > 0) rewardParts.push(`${result.xp} XP`);
      if (result.powerUp) {
        rewardParts.push(`${result.powerUpCount}x ${POWER_UP_NAMES[result.powerUp] || result.powerUp}`);
      }
      
      toast({
        title: "🎉 ჯილდო მიღებულია!",
        description: rewardParts.join(" • "),
      });
    }
    
    setClaimingId(null);
  };

  // Custom header icon
  const headerIcon = (
    <div className="relative">
      <img src={missionCrystalIcon} alt="" className="w-20 h-20 object-contain" />
      {unclaimedCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
        >
          {unclaimedCount}
        </motion.div>
      )}
    </div>
  );

  // Footer with reset timer
  const footer = (
    <div className="flex items-center justify-center gap-2 py-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <p className="text-muted-foreground text-xs">
        მისიები განახლდება: <span className="font-mono font-bold">{getTimeUntilMidnight()}</span>
      </p>
    </div>
  );

  return (
    <>
      {FlyingCurrencyComponent}
      <GameModal
        isOpen={isOpen}
        onClose={onClose}
        icon={headerIcon}
        title="დღის მისიები"
        subtitle="შეასრულე მისიები და აიღე ჯილდოები!"
        footer={footer}
        showSparkles
        className="max-h-[85vh]"
      >
        {/* Stats Badge */}
        <div 
          className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 mb-4 border border-violet-100"
          style={{ boxShadow: "0 3px 0 #DDD6FE, inset 0 1px 2px rgba(255, 255, 255, 0.8)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"
                style={{ boxShadow: "0 2px 0 #7C3AED" }}
              >
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-violet-500 font-medium">შესრულებული</p>
                <p className="text-base font-bold text-violet-700">
                  {claimedCount}/{missions.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <img src={coinIcon} alt="" className="w-5 h-5" />
                <span className="text-sm font-bold text-amber-600">{totalRewards.coins}</span>
              </div>
              <div className="flex items-center gap-1">
                <img src={gemIcon} alt="" className="w-5 h-5" />
                <span className="text-sm font-bold text-cyan-600">{totalRewards.gems}</span>
              </div>
              <div className="flex items-center gap-1">
                <img src={xpIcon} alt="" className="w-5 h-5" />
                <span className="text-sm font-bold text-violet-600">{totalRewards.xp}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Missions List */}
        <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-muted/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : missions.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">მისიები არ არის</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {missions.map((mission, index) => {
                const theme = getMissionTheme(mission.mission_id);
                const progress = Math.min(
                  (mission.current_progress / mission.target_value) * 100,
                  100
                );
                const isComplete = mission.completed;
                const isClaimed = mission.reward_claimed;
                const canClaim = isComplete && !isClaimed;
                const isClaiming = claimingId === mission.mission_id;

                return (
                  <motion.div
                    key={mission.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative rounded-2xl p-4 transition-all overflow-hidden ${
                      isClaimed 
                        ? "bg-muted/30 border border-border" 
                        : canClaim 
                          ? `${theme.bg} border-2 ${theme.border}` 
                          : `${theme.bg} border ${theme.border}`
                    }`}
                    style={{
                      boxShadow: isClaimed 
                        ? "none" 
                        : canClaim 
                          ? "0 4px 0 rgba(0,0,0,0.1), inset 0 1px 2px rgba(255, 255, 255, 0.8)"
                          : "0 3px 0 rgba(0,0,0,0.05), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
                    }}
                  >
                    {/* Golden glow for claimable */}
                    {canClaim && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-yellow-300/30 to-amber-400/20"
                        animate={{ 
                          opacity: [0.5, 0.8, 0.5],
                          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    <div className="relative flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${
                          isClaimed 
                            ? "bg-muted text-muted-foreground" 
                            : `bg-gradient-to-br ${theme.gradient}`
                        }`}
                        style={{
                          boxShadow: isClaimed ? "none" : "0 2px 0 rgba(0,0,0,0.2)",
                        }}
                      >
                        {isClaimed ? (
                          <Check className="w-6 h-6" />
                        ) : (
                          getMissionIcon(mission.mission_id)
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm ${isClaimed ? "text-muted-foreground line-through" : theme.text}`}>
                          {mission.mission_title}
                        </h3>
                        {mission.mission_description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {mission.mission_description}
                          </p>
                        )}

                        {/* Rewards Row */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {mission.reward_coins > 0 && (
                            <div className="flex items-center gap-1 bg-amber-100 rounded-full px-2 py-0.5">
                              <img src={coinIcon} alt="" className="w-4 h-4" />
                              <span className="text-xs font-bold text-amber-700">{mission.reward_coins}</span>
                            </div>
                          )}
                          {mission.reward_gems > 0 && (
                            <div className="flex items-center gap-1 bg-cyan-100 rounded-full px-2 py-0.5">
                              <img src={gemIcon} alt="" className="w-4 h-4" />
                              <span className="text-xs font-bold text-cyan-700">{mission.reward_gems}</span>
                            </div>
                          )}
                          {mission.reward_xp > 0 && (
                            <div className="flex items-center gap-1 bg-violet-100 rounded-full px-2 py-0.5">
                              <Sparkles className="w-3 h-3 text-violet-600" />
                              <span className="text-xs font-bold text-violet-700">{mission.reward_xp} XP</span>
                            </div>
                          )}
                          {mission.reward_power_up && mission.reward_power_up_count > 0 && (
                            <div className="flex items-center gap-1 bg-rose-100 rounded-full px-2 py-0.5">
                              <img 
                                src={POWER_UP_ICONS[mission.reward_power_up] || power5050} 
                                alt="" 
                                className="w-4 h-4" 
                              />
                              <span className="text-xs font-bold text-rose-700">
                                {mission.reward_power_up_count}x
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress bar */}
                        {!isClaimed && (
                          <div className="mt-2">
                            <div 
                              className="h-2 rounded-full overflow-hidden bg-black/10"
                              style={{ boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.1)" }}
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                className={`h-full rounded-full bg-gradient-to-r ${theme.progress}`}
                              />
                            </div>
                            <p className={`text-xs mt-1 font-medium ${theme.text}`}>
                              {mission.current_progress}/{mission.target_value}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Claim Button or Status */}
                      <div className="flex-shrink-0">
                        {canClaim ? (
                          <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          >
                            <Button
                              size="sm"
                              onClick={() => handleClaimMission(mission.mission_id)}
                              disabled={isClaiming}
                              className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-900 font-bold shadow-lg border-none"
                              style={{ boxShadow: "0 3px 0 #B45309" }}
                            >
                              {isClaiming ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1 }}
                                >
                                  <Sparkles className="w-4 h-4" />
                                </motion.div>
                              ) : (
                                <>
                                  <Gift className="w-4 h-4 mr-1" />
                                  მიიღე
                                </>
                              )}
                            </Button>
                          </motion.div>
                        ) : isClaimed ? (
                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 rounded-full px-3 py-1">
                            <Check className="w-4 h-4" />
                            <span className="text-xs font-bold">აღებულია</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </GameModal>
    </>
  );
}

export default MissionsModal;
