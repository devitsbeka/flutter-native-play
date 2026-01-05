import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy, Clock, Sparkles, Gift, Check, Flame, Award, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import { useMissions, getMissionTheme } from "@/hooks/useMissions";
import { useMissionStreak, getStreakBonus } from "@/hooks/useMissionStreak";
import { useMissionAchievements, ACHIEVEMENTS, RARITY_COLORS } from "@/hooks/useMissionAchievements";
import { useSound } from "@/contexts/SoundContext";
import { GameModal } from "@/components/ui/game-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import confetti from "canvas-confetti";
import { useFlyingCurrency } from "@/components/shared/FlyingCurrency";
import { toast } from "@/hooks/use-toast";

// Power-up icons
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import { TimeIcon } from "@/components/shared/TimeIcon";

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POWER_UP_ICONS: Record<string, string | null> = {
  "5050": power5050,
  "freeze": powerFreeze,
  "replace": powerReplace,
  "time-drain": null, // Use TimeIcon component instead
};

const POWER_UP_NAMES: Record<string, string> = {
  "5050": "50/50",
  "freeze": "გაყინვა",
  "replace": "ჩანაცვლება",
  "time-drain": "დროის გამოწვა",
};

const celebrateClaim = () => {
  // First burst
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.5, x: 0.5 },
    colors: ["#FFD700", "#FFA500", "#FF6B35", "#10B981", "#8B5CF6"],
    zIndex: 9999,
  });
  // Side bursts
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ["#FFD700", "#10B981"],
      zIndex: 9999,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ["#8B5CF6", "#EC4899"],
      zIndex: 9999,
    });
  }, 150);
};

const getMissionIcon = (missionId: string) => {
  const icons: Record<string, string> = {
    win_games: "🏆",
    answer_correct: "✅",
    play_categories: "🎯",
    play_games: "🎮",
    perfect_round: "⭐",
    weekly_wins: "👑",
    weekly_answers: "🧠",
    weekly_categories: "🌍",
    weekly_perfect: "💎",
  };
  return icons[missionId] || "🎲";
};

const getTimeUntilMidnight = (): string => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const getTimeUntilMonday = (): string => {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const diff = nextMonday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days}დ ${hours}სთ`;
};

interface Mission {
  id: string;
  mission_id: string;
  mission_title: string;
  mission_description: string | null;
  target_value: number;
  current_progress: number;
  reward_xp: number;
  reward_coins: number;
  reward_gems: number;
  reward_power_up: string | null;
  reward_power_up_count: number;
  completed: boolean;
  reward_claimed: boolean;
}

interface ClaimAnimationState {
  isAnimating: boolean;
  coins: number;
  gems: number;
  xp: number;
  powerUp: string | null;
  powerUpCount: number;
}

function MissionCarouselCard({ 
  mission, 
  onClaim, 
  isClaiming,
  claimAnimation,
  missionType
}: { 
  mission: Mission; 
  onClaim: (id: string) => void; 
  isClaiming: boolean;
  claimAnimation: ClaimAnimationState | null;
  missionType: "daily" | "weekly";
}) {
  const theme = getMissionTheme(mission.mission_id);
  const progress = Math.min((mission.current_progress / mission.target_value) * 100, 100);
  const isComplete = mission.completed;
  const isClaimed = mission.reward_claimed;
  const canClaim = isComplete && !isClaimed;
  const isThisAnimating = claimAnimation?.isAnimating;

  return (
    <div className="px-2">
      <motion.div
        layout
        className={`relative rounded-3xl p-6 transition-all overflow-hidden ${
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
              ? "0 8px 0 rgba(0,0,0,0.1), inset 0 2px 4px rgba(255, 255, 255, 0.8)"
              : "0 6px 0 rgba(0,0,0,0.05), inset 0 2px 4px rgba(255, 255, 255, 0.8)",
          minHeight: "280px",
        }}
      >
        {canClaim && !isThisAnimating && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-yellow-300/30 to-amber-400/20"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Claim Animation Overlay */}
        <AnimatePresence>
          {isThisAnimating && claimAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-amber-500/90 to-yellow-600/90 z-20 flex flex-col items-center justify-center rounded-3xl"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-black text-white mb-4"
              >
                მიღებულია!
              </motion.h3>
              
              {/* Reward Display */}
              <div className="flex flex-wrap gap-3 justify-center">
                {claimAnimation.coins > 0 && (
                  <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
                  >
                    <motion.img 
                      src={coinIcon} 
                      alt="" 
                      className="w-8 h-8"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                    <span className="text-xl font-black text-white">+{claimAnimation.coins}</span>
                  </motion.div>
                )}
                {claimAnimation.gems > 0 && (
                  <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
                  >
                    <motion.img 
                      src={gemIcon} 
                      alt="" 
                      className="w-8 h-8"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                    />
                    <span className="text-xl font-black text-white">+{claimAnimation.gems}</span>
                  </motion.div>
                )}
                {claimAnimation.xp > 0 && (
                  <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
                  >
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      <Sparkles className="w-7 h-7 text-violet-200" />
                    </motion.div>
                    <span className="text-xl font-black text-white">+{claimAnimation.xp} XP</span>
                  </motion.div>
                )}
                {claimAnimation.powerUp && claimAnimation.powerUpCount > 0 && (
                  <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
                  >
                    {claimAnimation.powerUp === "time-drain" ? (
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                      >
                        <TimeIcon size={32} />
                      </motion.div>
                    ) : (
                      <motion.img 
                        src={POWER_UP_ICONS[claimAnimation.powerUp] || power5050} 
                        alt="" 
                        className="w-8 h-8"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                      />
                    )}
                    <span className="text-xl font-black text-white">+{claimAnimation.powerUpCount}</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex flex-col items-center text-center">
          {/* Large Icon */}
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 ${
              isClaimed ? "bg-muted text-muted-foreground" : `bg-gradient-to-br ${theme.gradient}`
            }`}
            style={{ boxShadow: isClaimed ? "none" : "0 4px 0 rgba(0,0,0,0.2)" }}
          >
            {isClaimed ? <Check className="w-10 h-10" /> : getMissionIcon(mission.mission_id)}
          </div>

          {/* Title */}
          <h3 className={`font-black text-lg mb-1 ${isClaimed ? "text-muted-foreground" : theme.text}`}>
            {mission.mission_title}
          </h3>
          
          {mission.mission_description && (
            <p className="text-sm text-muted-foreground mb-4">
              {mission.mission_description}
            </p>
          )}

          {/* Progress Bar - only show if not claimed */}
          {!isClaimed && (
            <div className="w-full mb-4">
              <div className="h-3 rounded-full overflow-hidden bg-black/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full bg-gradient-to-r ${theme.progress}`}
                />
              </div>
              <p className={`text-sm mt-2 font-bold ${theme.text}`}>
                {mission.current_progress} / {mission.target_value}
              </p>
            </div>
          )}

          {/* Rewards Preview - show inline for claimed */}
          {!isClaimed && (
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {mission.reward_coins > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-100 rounded-full px-3 py-1.5">
                  <img src={coinIcon} alt="" className="w-5 h-5" />
                  <span className="text-sm font-bold text-amber-700">{mission.reward_coins}</span>
                </div>
              )}
              {mission.reward_gems > 0 && (
                <div className="flex items-center gap-1.5 bg-cyan-100 rounded-full px-3 py-1.5">
                  <img src={gemIcon} alt="" className="w-5 h-5" />
                  <span className="text-sm font-bold text-cyan-700">{mission.reward_gems}</span>
                </div>
              )}
              {mission.reward_xp > 0 && (
                <div className="flex items-center gap-1.5 bg-violet-100 rounded-full px-3 py-1.5">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-bold text-violet-700">{mission.reward_xp} XP</span>
                </div>
              )}
              {mission.reward_power_up && mission.reward_power_up_count > 0 && (
                <div className="flex items-center gap-1.5 bg-rose-100 rounded-full px-3 py-1.5">
                  {mission.reward_power_up === "time-drain" ? (
                    <TimeIcon size={20} />
                  ) : (
                    <img src={POWER_UP_ICONS[mission.reward_power_up] || power5050} alt="" className="w-5 h-5" />
                  )}
                  <span className="text-sm font-bold text-rose-700">{mission.reward_power_up_count}x</span>
                </div>
              )}
            </div>
          )}

          {/* Claimed rewards on single line */}
          {isClaimed && (
            <div className="flex items-center gap-2 justify-center mb-4 flex-wrap">
              {mission.reward_coins > 0 && (
                <div className="flex items-center gap-1">
                  <img src={coinIcon} alt="" className="w-4 h-4" />
                  <span className="text-xs font-bold text-amber-600">{mission.reward_coins}</span>
                </div>
              )}
              {mission.reward_gems > 0 && (
                <div className="flex items-center gap-1">
                  <img src={gemIcon} alt="" className="w-4 h-4" />
                  <span className="text-xs font-bold text-cyan-600">{mission.reward_gems}</span>
                </div>
              )}
              {mission.reward_xp > 0 && (
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-violet-500" />
                  <span className="text-xs font-bold text-violet-600">{mission.reward_xp} XP</span>
                </div>
              )}
              {mission.reward_power_up && mission.reward_power_up_count > 0 && (
                <div className="flex items-center gap-1">
                  {mission.reward_power_up === "time-drain" ? (
                    <TimeIcon size={16} />
                  ) : (
                    <img src={POWER_UP_ICONS[mission.reward_power_up] || power5050} alt="" className="w-4 h-4" />
                  )}
                  <span className="text-xs font-bold text-rose-600">{mission.reward_power_up_count}x</span>
                </div>
              )}
            </div>
          )}

          {/* Claim Button */}
          {canClaim ? (
            <motion.div 
              animate={{ scale: [1, 1.03, 1] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-full"
            >
              <Button
                size="lg"
                onClick={() => onClaim(mission.mission_id)}
                disabled={isClaiming}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-900 font-black text-lg shadow-lg border-none h-14"
                style={{ boxShadow: "0 4px 0 #B45309" }}
              >
                {isClaiming ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Sparkles className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <>
                    <Gift className="w-6 h-6 mr-2" />
                    მიიღე ჯილდო
                  </>
                )}
              </Button>
            </motion.div>
          ) : isClaimed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-100 rounded-full px-4 py-1.5">
                <Check className="w-4 h-4" />
                <span className="font-medium text-sm">აღებულია</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Clock className="w-3 h-3" />
                <span>ახალი: {missionType === "daily" ? getTimeUntilMidnight() : getTimeUntilMonday()}</span>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

function CarouselDots({ count, current, onSelect }: { count: number; current: number; onSelect: (index: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`transition-all duration-200 rounded-full ${
            index === current 
              ? "w-8 h-2 bg-primary" 
              : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
          }`}
        />
      ))}
    </div>
  );
}

function RewardPreview({ missions }: { missions: Mission[] }) {
  const unclaimedMissions = missions.filter(m => !m.reward_claimed);
  const completedUnclaimed = missions.filter(m => m.completed && !m.reward_claimed).length;
  
  const totalCoins = unclaimedMissions.reduce((sum, m) => sum + m.reward_coins, 0);
  const totalGems = unclaimedMissions.reduce((sum, m) => sum + m.reward_gems, 0);
  const totalXp = unclaimedMissions.reduce((sum, m) => sum + m.reward_xp, 0);
  const totalPowerUps = unclaimedMissions.reduce((sum, m) => sum + m.reward_power_up_count, 0);

  if (unclaimedMissions.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-3 mb-4 border border-violet-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-violet-600 font-medium">შესაძლო ჯილდოები</p>
          {completedUnclaimed > 0 && (
            <p className="text-[10px] text-violet-500">{completedUnclaimed} მზადაა ასაღებად</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {totalCoins > 0 && (
            <div className="flex items-center gap-1">
              <img src={coinIcon} alt="" className="w-4 h-4" />
              <span className="text-xs font-bold text-amber-600">{totalCoins}</span>
            </div>
          )}
          {totalGems > 0 && (
            <div className="flex items-center gap-1">
              <img src={gemIcon} alt="" className="w-4 h-4" />
              <span className="text-xs font-bold text-cyan-600">{totalGems}</span>
            </div>
          )}
          {totalXp > 0 && (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-500" />
              <span className="text-xs font-bold text-violet-600">{totalXp}</span>
            </div>
          )}
          {totalPowerUps > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs">⚡</span>
              <span className="text-xs font-bold text-rose-600">{totalPowerUps}x</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MissionsModal({ isOpen, onClose }: MissionsModalProps) {
  const { dailyMissions, weeklyMissions, loading, claimMissionReward, allDailyComplete, allDailyClaimed } = useMissions();
  const { currentStreak, bestStreak, canClaimBonus, claimStreakBonus, recordDailyCompletion, totalCompletions } = useMissionStreak();
  const { achievements, isUnlocked, checkAndUnlockAchievements, unlockedCount, totalCount } = useMissionAchievements();
  const { playSound } = useSound();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimAnimation, setClaimAnimation] = useState<ClaimAnimationState | null>(null);
  const [activeTab, setActiveTab] = useState("daily");
  const { triggerFlyingCurrency, FlyingCurrencyComponent } = useFlyingCurrency();
  
  const [dailyApi, setDailyApi] = useState<CarouselApi>();
  const [weeklyApi, setWeeklyApi] = useState<CarouselApi>();
  const [dailyCurrent, setDailyCurrent] = useState(0);
  const [weeklyCurrent, setWeeklyCurrent] = useState(0);

  const streakBonus = getStreakBonus(currentStreak);
  const canClaimStreakBonus = allDailyComplete && allDailyClaimed && canClaimBonus;

  useEffect(() => {
    if (!dailyApi) return;
    setDailyCurrent(dailyApi.selectedScrollSnap());
    dailyApi.on("select", () => setDailyCurrent(dailyApi.selectedScrollSnap()));
  }, [dailyApi]);

  useEffect(() => {
    if (!weeklyApi) return;
    setWeeklyCurrent(weeklyApi.selectedScrollSnap());
    weeklyApi.on("select", () => setWeeklyCurrent(weeklyApi.selectedScrollSnap()));
  }, [weeklyApi]);

  const handleClaimMission = async (missionId: string) => {
    setClaimingId(missionId);
    playSound("reward");
    
    const result = await claimMissionReward(missionId);
    
    if (result.success) {
      // Show claim animation overlay
      setClaimAnimation({
        isAnimating: true,
        coins: result.coins,
        gems: result.gems,
        xp: result.xp,
        powerUp: result.powerUp,
        powerUpCount: result.powerUpCount,
      });
      
      celebrateClaim();
      
      // Trigger flying currency
      setTimeout(() => {
        if (result.coins > 0) triggerFlyingCurrency("coins", Math.min(result.coins / 10, 10));
        if (result.gems > 0) triggerFlyingCurrency("gems", result.gems);
      }, 500);

      // Hide animation after delay and scroll to next
      setTimeout(() => {
        setClaimAnimation(null);
        
        // Auto-scroll to next unclaimed mission
        const currentMissions = activeTab === "daily" ? dailyMissions : weeklyMissions;
        const currentApi = activeTab === "daily" ? dailyApi : weeklyApi;
        const nextUnclaimed = currentMissions.findIndex((m, i) => 
          i > (activeTab === "daily" ? dailyCurrent : weeklyCurrent) && !m.reward_claimed && m.completed
        );
        if (nextUnclaimed !== -1 && currentApi) {
          currentApi.scrollTo(nextUnclaimed);
        }
      }, 2000);

      // Check for streak bonus eligibility after claiming
      const dailyClaimedCount = dailyMissions.filter((m) => m.reward_claimed || m.mission_id === missionId).length;
      if (dailyClaimedCount === dailyMissions.length) {
        const streakResult = await recordDailyCompletion();
        if (streakResult.newStreak > 0) {
          const newAchievements = await checkAndUnlockAchievements(streakResult.newStreak, totalCompletions + 1);
          for (const achievement of newAchievements) {
            toast({
              title: `🏅 მიღწევა გახსნილია!`,
              description: `${achievement.icon} ${achievement.title}`,
            });
          }
        }
      }
    }
    
    setClaimingId(null);
  };

  const handleClaimStreakBonus = async () => {
    playSound("reward");
    const result = await claimStreakBonus();
    if (result.success) {
      celebrateClaim();
      if (result.coins > 0) triggerFlyingCurrency("coins", Math.min(result.coins / 10, 10));
      if (result.gems > 0) triggerFlyingCurrency("gems", result.gems);
      toast({
        title: "🔥 სტრიქის ბონუსი!",
        description: `${result.coins} მონეტა • ${result.gems} ლალი • ${result.xp} XP`,
      });
    }
  };

  const headerIcon = (
    <div className="relative">
      <img src={missionCrystalIcon} alt="" className="w-20 h-20 object-contain" />
      {(dailyMissions.filter((m) => m.completed && !m.reward_claimed).length + weeklyMissions.filter((m) => m.completed && !m.reward_claimed).length) > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
        >
          {dailyMissions.filter((m) => m.completed && !m.reward_claimed).length + weeklyMissions.filter((m) => m.completed && !m.reward_claimed).length}
        </motion.div>
      )}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-center gap-4 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Clock className="w-4 h-4" />
        <span>დღის: <span className="font-mono font-bold">{getTimeUntilMidnight()}</span></span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Calendar className="w-4 h-4" />
        <span>კვირის: <span className="font-mono font-bold">{getTimeUntilMonday()}</span></span>
      </div>
    </div>
  );

  return (
    <>
      {FlyingCurrencyComponent}
      <GameModal
        isOpen={isOpen}
        onClose={onClose}
        icon={headerIcon}
        title="მისიები"
        subtitle="შეასრულე მისიები და აიღე ჯილდოები!"
        footer={footer}
        showSparkles
        className="max-h-[90vh]"
      >
        {/* Streak Banner */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 mb-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-orange-600 font-medium">სტრიქი</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-orange-700">{currentStreak}</span>
                  <span className="text-xs text-orange-500">დღე</span>
                </div>
              </div>
            </div>
            {canClaimStreakBonus && (
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Button
                  size="sm"
                  onClick={handleClaimStreakBonus}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs"
                >
                  <Gift className="w-3 h-3 mr-1" />
                  +{streakBonus.coins} • +{streakBonus.gems} 💎
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="daily" className="text-xs">
              დღის
              {dailyMissions.filter((m) => m.completed && !m.reward_claimed).length > 0 && (
                <span className="ml-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center">
                  {dailyMissions.filter((m) => m.completed && !m.reward_claimed).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">
              კვირის
              {weeklyMissions.filter((m) => m.completed && !m.reward_claimed).length > 0 && (
                <span className="ml-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center">
                  {weeklyMissions.filter((m) => m.completed && !m.reward_claimed).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs">
              <Award className="w-3 h-3 mr-1" />
              მიღწევები
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            {loading ? (
              <div className="h-72 bg-muted/50 rounded-2xl animate-pulse" />
            ) : dailyMissions.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">მისიები არ არის</p>
              </div>
            ) : (
              <>
                <RewardPreview missions={dailyMissions} />
                <Carousel 
                  setApi={setDailyApi}
                  opts={{ align: "center", loop: false }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {dailyMissions.map((mission) => (
                      <CarouselItem key={mission.id} className="pl-2 basis-full">
                        <MissionCarouselCard
                          mission={mission}
                          onClaim={handleClaimMission}
                          isClaiming={claimingId === mission.mission_id}
                          claimAnimation={claimingId === mission.mission_id ? claimAnimation : null}
                          missionType="daily"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
                <CarouselDots 
                  count={dailyMissions.length} 
                  current={dailyCurrent} 
                  onSelect={(i) => dailyApi?.scrollTo(i)} 
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="weekly">
            {loading ? (
              <div className="h-72 bg-muted/50 rounded-2xl animate-pulse" />
            ) : weeklyMissions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">კვირული მისიები არ არის</p>
              </div>
            ) : (
              <>
                <RewardPreview missions={weeklyMissions} />
                <Carousel 
                  setApi={setWeeklyApi}
                  opts={{ align: "center", loop: false }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {weeklyMissions.map((mission) => (
                      <CarouselItem key={mission.id} className="pl-2 basis-full">
                        <MissionCarouselCard
                          mission={mission}
                          onClaim={handleClaimMission}
                          isClaiming={claimingId === mission.mission_id}
                          claimAnimation={claimingId === mission.mission_id ? claimAnimation : null}
                          missionType="weekly"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
                <CarouselDots 
                  count={weeklyMissions.length} 
                  current={weeklyCurrent} 
                  onSelect={(i) => weeklyApi?.scrollTo(i)} 
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs text-muted-foreground">გახსნილია: {unlockedCount}/{totalCount}</p>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            {ACHIEVEMENTS.map((achievement, index) => {
              const unlocked = isUnlocked(achievement.id);
              const rarityStyle = RARITY_COLORS[achievement.rarity];
              
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative rounded-2xl p-4 border ${
                    unlocked 
                      ? `${rarityStyle.bg} ${rarityStyle.border}` 
                      : "bg-muted/20 border-border opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      unlocked 
                        ? `bg-gradient-to-br ${rarityStyle.gradient}` 
                        : "bg-muted"
                    }`}>
                      {unlocked ? achievement.icon : "🔒"}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm ${unlocked ? rarityStyle.text : "text-muted-foreground"}`}>
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${rarityStyle.bg} ${rarityStyle.text}`}>
                          {achievement.rarity === "common" && "ჩვეულებრივი"}
                          {achievement.rarity === "rare" && "იშვიათი"}
                          {achievement.rarity === "epic" && "ეპიკური"}
                          {achievement.rarity === "legendary" && "ლეგენდარული"}
                        </span>
                        {unlocked && (
                          <div className="flex items-center gap-1">
                            <img src={coinIcon} alt="" className="w-3 h-3" />
                            <span className="text-[10px] font-bold text-amber-600">{achievement.reward_coins}</span>
                            <img src={gemIcon} alt="" className="w-3 h-3 ml-1" />
                            <span className="text-[10px] font-bold text-cyan-600">{achievement.reward_gems}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {unlocked && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check className="w-5 h-5 text-emerald-600" />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </TabsContent>
        </Tabs>
      </GameModal>
    </>
  );
}

export default MissionsModal;
