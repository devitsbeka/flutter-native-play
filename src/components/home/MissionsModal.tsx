import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy, Clock, Sparkles, Gift, Check, Flame, Award, Calendar } from "lucide-react";
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

interface MissionCardProps {
  mission: {
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
  };
  index: number;
  onClaim: (id: string) => void;
  isClaiming: boolean;
}

function MissionCard({ mission, index, onClaim, isClaiming }: MissionCardProps) {
  const theme = getMissionTheme(mission.mission_id);
  const progress = Math.min((mission.current_progress / mission.target_value) * 100, 100);
  const isComplete = mission.completed;
  const isClaimed = mission.reward_claimed;
  const canClaim = isComplete && !isClaimed;

  return (
    <motion.div
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
      {canClaim && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-yellow-300/30 to-amber-400/20"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative flex items-start gap-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${
            isClaimed ? "bg-muted text-muted-foreground" : `bg-gradient-to-br ${theme.gradient}`
          }`}
          style={{ boxShadow: isClaimed ? "none" : "0 2px 0 rgba(0,0,0,0.2)" }}
        >
          {isClaimed ? <Check className="w-6 h-6" /> : getMissionIcon(mission.mission_id)}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm ${isClaimed ? "text-muted-foreground line-through" : theme.text}`}>
            {mission.mission_title}
          </h3>
          {mission.mission_description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {mission.mission_description}
            </p>
          )}

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
                <img src={POWER_UP_ICONS[mission.reward_power_up] || power5050} alt="" className="w-4 h-4" />
                <span className="text-xs font-bold text-rose-700">{mission.reward_power_up_count}x</span>
              </div>
            )}
          </div>

          {!isClaimed && (
            <div className="mt-2">
              <div className="h-2 rounded-full overflow-hidden bg-black/10">
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

        <div className="flex-shrink-0">
          {canClaim ? (
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <Button
                size="sm"
                onClick={() => onClaim(mission.mission_id)}
                disabled={isClaiming}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-900 font-bold shadow-lg border-none"
                style={{ boxShadow: "0 3px 0 #B45309" }}
              >
                {isClaiming ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
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
}

export function MissionsModal({ isOpen, onClose }: MissionsModalProps) {
  const { dailyMissions, weeklyMissions, loading, claimMissionReward, allDailyComplete, allDailyClaimed } = useMissions();
  const { currentStreak, bestStreak, canClaimBonus, claimStreakBonus, recordDailyCompletion, totalCompletions } = useMissionStreak();
  const { achievements, isUnlocked, checkAndUnlockAchievements, unlockedCount, totalCount } = useMissionAchievements();
  const { playSound } = useSound();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("daily");
  const { triggerFlyingCurrency, FlyingCurrencyComponent } = useFlyingCurrency();

  const streakBonus = getStreakBonus(currentStreak);
  const canClaimStreakBonus = allDailyComplete && allDailyClaimed && canClaimBonus;

  const handleClaimMission = async (missionId: string) => {
    setClaimingId(missionId);
    playSound("reward");
    
    const result = await claimMissionReward(missionId);
    
    if (result.success) {
      celebrateClaim();
      if (result.coins > 0) triggerFlyingCurrency("coins", Math.min(result.coins / 10, 10));
      if (result.gems > 0) triggerFlyingCurrency("gems", result.gems);
      
      const rewardParts = [];
      if (result.coins > 0) rewardParts.push(`${result.coins} მონეტა`);
      if (result.gems > 0) rewardParts.push(`${result.gems} ლალი`);
      if (result.xp > 0) rewardParts.push(`${result.xp} XP`);
      if (result.powerUp) rewardParts.push(`${result.powerUpCount}x ${POWER_UP_NAMES[result.powerUp] || result.powerUp}`);
      
      toast({ title: "🎉 ჯილდო მიღებულია!", description: rewardParts.join(" • ") });

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
        <span>დღიური: <span className="font-mono font-bold">{getTimeUntilMidnight()}</span></span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Calendar className="w-4 h-4" />
        <span>კვირული: <span className="font-mono font-bold">{getTimeUntilMonday()}</span></span>
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
            <div className="text-right">
              <p className="text-xs text-orange-500">საუკეთესო: {bestStreak}</p>
              {canClaimStreakBonus ? (
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <Button
                    size="sm"
                    onClick={handleClaimStreakBonus}
                    className="mt-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs"
                  >
                    <Gift className="w-3 h-3 mr-1" />
                    +{streakBonus.coins} • +{streakBonus.gems} 💎
                  </Button>
                </motion.div>
              ) : allDailyComplete && !allDailyClaimed ? (
                <p className="text-xs text-orange-600 mt-1">აიღე ჯილდოები!</p>
              ) : (
                <p className="text-xs text-orange-500 mt-1">შეასრულე ყველა მისია</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="daily" className="text-xs">
              დღიური
              {dailyMissions.filter((m) => m.completed && !m.reward_claimed).length > 0 && (
                <span className="ml-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center">
                  {dailyMissions.filter((m) => m.completed && !m.reward_claimed).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">
              კვირული
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

          <TabsContent value="daily" className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : dailyMissions.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">მისიები არ არის</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {dailyMissions.map((mission, index) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    index={index}
                    onClaim={handleClaimMission}
                    isClaiming={claimingId === mission.mission_id}
                  />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : weeklyMissions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">კვირული მისიები არ არის</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {weeklyMissions.map((mission, index) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    index={index}
                    onClaim={handleClaimMission}
                    isClaiming={claimingId === mission.mission_id}
                  />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
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
