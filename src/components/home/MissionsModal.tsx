import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy, Clock, Sparkles, Gift, Check, Flame, Award, Calendar, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import { useMissions, getMissionTheme } from "@/hooks/useMissions";
import { useMissionStreak, getStreakBonus } from "@/hooks/useMissionStreak";
import { useMissionAchievements, ACHIEVEMENTS, RARITY_COLORS } from "@/hooks/useMissionAchievements";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { GameModal } from "@/components/ui/game-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import confetti from "canvas-confetti";
import { useFlyingCurrency } from "@/components/shared/FlyingCurrency";
import { toast } from "@/hooks/use-toast";
import { AppIcon } from "@/components/shared/AppIcon";

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

const POWER_UP_NAME_KEYS: Record<string, string> = {
  "5050": "missions.powerUpNames.fiftyFifty",
  "freeze": "missions.powerUpNames.freeze",
  "replace": "missions.powerUpNames.replace",
  "time-drain": "missions.powerUpNames.timeDrain",
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

const getMissionIconSlug = (missionId: string) => {
  const icons: Record<string, string> = {
    win_games: "trophy",
    answer_correct: "check",
    play_categories: "target",
    play_games: "game-controller",
    perfect_round: "star",
    weekly_wins: "crown",
    weekly_answers: "brain",
    weekly_categories: "globe",
    weekly_perfect: "diamond",
  };
  return icons[missionId] || "dice";
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

const getTimeUntilMonday = (t: (key: string) => string): string => {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const diff = nextMonday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days}${t("missions.timeDays")} ${hours}${t("missions.timeHours")}`;
};

// Map mission_id to translation keys for title/description
const MISSION_TITLE_KEYS: Record<string, { title: string; desc: string }> = {
  win_games: { title: "missions.dailyWinGames", desc: "missions.dailyWinGamesDesc" },
  answer_correct: { title: "missions.dailyAnswerCorrect", desc: "missions.dailyAnswerCorrectDesc" },
  play_categories: { title: "missions.dailyPlayCategories", desc: "missions.dailyPlayCategoriesDesc" },
  play_games: { title: "missions.dailyPlayGames", desc: "missions.dailyPlayGamesDesc" },
  perfect_round: { title: "missions.dailyPerfectRound", desc: "missions.dailyPerfectRoundDesc" },
  weekly_wins: { title: "missions.weeklyWins", desc: "missions.weeklyWinsDesc" },
  weekly_answers: { title: "missions.weeklyAnswers", desc: "missions.weeklyAnswersDesc" },
  weekly_categories: { title: "missions.weeklyCategories", desc: "missions.weeklyCategoriesDesc" },
  weekly_perfect: { title: "missions.weeklyPerfect", desc: "missions.weeklyPerfectDesc" },
};

// Map achievement_id to translation keys
const ACHIEVEMENT_TITLE_KEYS: Record<string, { title: string; desc: string }> = {
  streak_3: { title: "missions.achStreak3", desc: "missions.achStreak3Desc" },
  streak_7: { title: "missions.achStreak7", desc: "missions.achStreak7Desc" },
  streak_14: { title: "missions.achStreak14", desc: "missions.achStreak14Desc" },
  streak_30: { title: "missions.achStreak30", desc: "missions.achStreak30Desc" },
  missions_10: { title: "missions.achMissions10", desc: "missions.achMissions10Desc" },
  missions_50: { title: "missions.achMissions50", desc: "missions.achMissions50Desc" },
  missions_100: { title: "missions.achMissions100", desc: "missions.achMissions100Desc" },
  missions_500: { title: "missions.achMissions500", desc: "missions.achMissions500Desc" },
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
  missionType,
  t,
}: { 
  mission: Mission; 
  onClaim: (id: string) => void; 
  isClaiming: boolean;
  claimAnimation: ClaimAnimationState | null;
  missionType: "daily" | "weekly";
  t: (key: string) => string;
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
              ? "0 6px 0 rgba(0,0,0,0.1), inset 0 2px 4px rgba(255, 255, 255, 0.8)"
              : "0 4px 0 rgba(0,0,0,0.05), inset 0 2px 4px rgba(255, 255, 255, 0.8)",
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
                className="mb-4"
              >
                <AppIcon slug="sparkles" size={64} />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-black text-white mb-4"
              >
                {t("missions.received")}
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
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-3 ${
              isClaimed ? "bg-muted text-muted-foreground" : `bg-gradient-to-br ${theme.gradient}`
            }`}
            style={{ boxShadow: isClaimed ? "none" : "0 3px 0 rgba(0,0,0,0.2)" }}
          >
            {isClaimed ? (
              <Check className="w-7 h-7" />
            ) : (
              <AppIcon slug={getMissionIconSlug(mission.mission_id)} size={32} />
            )}
          </div>

          {/* Title */}
          <h3 className={`font-black text-base mb-1 ${isClaimed ? "text-muted-foreground" : theme.text}`}>
            {MISSION_TITLE_KEYS[mission.mission_id] ? t(MISSION_TITLE_KEYS[mission.mission_id].title) : mission.mission_title}
          </h3>
          
          {mission.mission_description && (
            <p className="text-xs text-muted-foreground mb-3">
              {MISSION_TITLE_KEYS[mission.mission_id] ? t(MISSION_TITLE_KEYS[mission.mission_id].desc) : mission.mission_description}
            </p>
          )}

          {/* Progress Bar - only show if not claimed */}
          {!isClaimed && (
            <div className="w-full mb-3">
              <div className="h-2.5 rounded-full overflow-hidden bg-black/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full bg-gradient-to-r ${theme.progress}`}
                />
              </div>
              <p className={`text-xs mt-1.5 font-bold ${theme.text}`}>
                {mission.current_progress} / {mission.target_value}
              </p>
            </div>
          )}

          {/* Rewards Preview - show inline for claimed */}
          {!isClaimed && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-3">
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
            <div className="flex items-center gap-2 justify-center mb-3 flex-wrap">
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
                size="default"
                onClick={() => onClaim(mission.mission_id)}
                disabled={isClaiming}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-900 font-black text-base shadow-lg border-none h-11"
                style={{ boxShadow: "0 3px 0 #B45309" }}
              >
                {isClaiming ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Sparkles className="w-6 h-6" />
                  </motion.div>
                ) : (
                <>
                    <Gift className="w-6 h-6 mr-2" />
                    {t("missions.claimReward")}
                  </>
                )}
              </Button>
            </motion.div>
          ) : isClaimed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-100 rounded-full px-4 py-1.5">
                <Check className="w-4 h-4" />
                <span className="font-medium text-sm">{t("missions.claimed")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Clock className="w-3 h-3" />
                <span>{t("missions.newIn")}: {missionType === "daily" ? getTimeUntilMidnight() : getTimeUntilMonday(t)}</span>
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
    <div className="flex items-center justify-center gap-2 mt-2">
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


export function MissionsModal({ isOpen, onClose }: MissionsModalProps) {
  const { t } = useLanguage();
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
    // One claim at a time — a second claim started while the first is in
    // flight would compute XP off the same stale profile snapshot.
    if (claimingId !== null) return;
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
              title: t("missions.achievementUnlocked"),
              description: (
                <span className="inline-flex items-center gap-2">
                  <AppIcon slug={achievement.icon_slug} size={18} />
                  <span>{achievement.title}</span>
                </span>
              ),
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
        title: t("missions.streakBonus"),
        description: `${result.coins} ${t("dailyRewards.coins")} • ${result.gems} ${t("dailyRewards.gems")} • ${result.xp} XP`,
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
        <span>{t("missions.daily")}: <span className="font-mono font-bold">{getTimeUntilMidnight()}</span></span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Calendar className="w-4 h-4" />
        <span>{t("missions.weekly")}: <span className="font-mono font-bold">{getTimeUntilMonday(t)}</span></span>
      </div>
    </div>
  );

  return (
    <>
      {FlyingCurrencyComponent}
      <GameModal
        isOpen={isOpen}
        onClose={onClose}
        fullScreen={false}
        icon={headerIcon}
        title={t("missions.title")}
        subtitle={t("missions.subtitle")}
        footer={footer}
        showSparkles
        className="max-h-[90vh]"
      >
        {/* Streak Banner */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-2.5 mb-2 border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-orange-700">{t("missions.streak")}: {currentStreak} {t("missions.days")}</span>
          </div>
            {canClaimStreakBonus && (
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Button
                  size="sm"
                  onClick={handleClaimStreakBonus}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs h-7 px-2"
                >
                  <Gift className="w-3 h-3 mr-1" />
                  <img src={coinIcon} alt="" className="w-3 h-3" /> +{streakBonus.coins} • <img src={gemIcon} alt="" className="w-3 h-3" /> +{streakBonus.gems}
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-2">
            <TabsTrigger value="daily" className="text-xs">
              {t("missions.daily")}
              {dailyMissions.filter((m) => m.completed && !m.reward_claimed).length > 0 && (
                <span className="ml-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center">
                  {dailyMissions.filter((m) => m.completed && !m.reward_claimed).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">
              {t("missions.weekly")}
              {weeklyMissions.filter((m) => m.completed && !m.reward_claimed).length > 0 && (
                <span className="ml-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center">
                  {weeklyMissions.filter((m) => m.completed && !m.reward_claimed).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs">
              <Award className="w-3 h-3 mr-1" />
              {t("missions.achievements")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            {loading ? (
              <div className="h-72 bg-muted/50 rounded-2xl animate-pulse" />
            ) : dailyMissions.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t("missions.noMissions")}</p>
              </div>
            ) : (
              <>
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
                          t={t}
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
                <p className="text-muted-foreground">{t("missions.noWeeklyMissions")}</p>
              </div>
            ) : (
              <>
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
                          t={t}
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
              <p className="text-xs text-muted-foreground">{t("missions.unlocked")}: {unlockedCount}/{totalCount}</p>
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
                      {unlocked ? (
                        <AppIcon slug={achievement.icon_slug} size={26} />
                      ) : (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm ${unlocked ? rarityStyle.text : "text-muted-foreground"}`}>
                        {ACHIEVEMENT_TITLE_KEYS[achievement.id] ? t(ACHIEVEMENT_TITLE_KEYS[achievement.id].title) : achievement.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">{ACHIEVEMENT_TITLE_KEYS[achievement.id] ? t(ACHIEVEMENT_TITLE_KEYS[achievement.id].desc) : achievement.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${rarityStyle.bg} ${rarityStyle.text}`}>
                          {t(`missions.rarity.${achievement.rarity}`)}
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
