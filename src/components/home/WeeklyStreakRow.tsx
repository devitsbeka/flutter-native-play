import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Gift, Flame, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { GameModal } from "@/components/ui/game-modal";
import { getStreakMilestones } from "@/utils/levelCalculation";

interface StreakDayData {
  dayNumber: number;
  isCompleted: boolean;
  isMilestone: boolean;
  milestoneReward?: string;
  milestoneBonus?: number;
}

const MILESTONE_MAP = new Map<number, { bonus: number; rewardKey: string }>();

function buildMilestoneMap() {
  if (MILESTONE_MAP.size > 0) return;
  const milestones = getStreakMilestones();
  milestones.forEach((m) => {
    let rewardKey = "milestoneXpBonus";
    if (m.days >= 30) rewardKey = "milestoneDoubleXp";
    else if (m.days >= 7) rewardKey = "milestoneXpBonusGift";
    MILESTONE_MAP.set(m.days, { bonus: m.bonus, rewardKey });
  });
}

export function WeeklyStreakRow({ onNewClick }: { onNewClick?: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<StreakDayData | null>(null);

  buildMilestoneMap();

  const { data: profile } = useQuery({
    queryKey: ["profile-streak", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("current_streak, best_streak")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const currentStreak = profile?.current_streak ?? 0;

  // Build streak days: show up to max(currentStreak, 30) days, or at least 14 for visual appeal
  const totalDays = Math.max(currentStreak + 7, 14);
  const streakDays: StreakDayData[] = Array.from({ length: totalDays }, (_, i) => {
    const dayNumber = i + 1;
    const milestoneInfo = MILESTONE_MAP.get(dayNumber);
    return {
      dayNumber,
      isCompleted: dayNumber <= currentStreak,
      isMilestone: !!milestoneInfo,
      milestoneReward: milestoneInfo?.rewardKey,
      milestoneBonus: milestoneInfo?.bonus,
    };
  });

  if (!user) return null;

  function getMilestoneRewardText(day: StreakDayData): string {
    if (!day.milestoneReward || !day.milestoneBonus) return "";
    if (day.milestoneReward === "milestoneDoubleXp") {
      return t(`extra.${day.milestoneReward}`);
    }
    return t(`extra.${day.milestoneReward}`, { percent: day.milestoneBonus });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full px-4 pt-2 pb-1 pointer-events-auto z-30 relative"
      >
        {/* Top row: label + NEW button */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-base font-bold text-foreground">
              {t("extra.yourStreak")}
            </span>
            {currentStreak > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                  color: "#92400E",
                  boxShadow: "0 2px 0 rgba(253,230,138,0.5)",
                }}
              >
                {currentStreak} 🔥
              </span>
            )}
          </div>
          <motion.button
            onClick={onNewClick}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold text-white"
            style={{
              background: "linear-gradient(180deg, #9C6ADE 0%, #7B4BBF 100%)",
              boxShadow: "0 4px 0 #5B2FA0, 0 6px 12px rgba(124, 58, 237, 0.3)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 2 }}
          >
            <Plus className="w-4 h-4" />
            {t("extra.newButton")}
          </motion.button>
        </div>

        {/* Scrollable streak days */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          {streakDays.map((day, i) => {
            const isNext = day.dayNumber === currentStreak + 1;
            return (
              <motion.div
                key={day.dayNumber}
                className="flex flex-col items-center gap-1 flex-shrink-0"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.5), type: "spring", stiffness: 300 }}
              >
                {/* Day label */}
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {day.dayNumber}
                </span>

                {/* Circle */}
                <motion.button
                  onClick={day.isMilestone ? () => setSelectedMilestone(day) : undefined}
                  className="w-10 h-10 rounded-full flex items-center justify-center relative"
                  style={
                    day.isCompleted
                      ? day.isMilestone
                        ? {
                            background: "linear-gradient(180deg, #A78BFA 0%, #7C3AED 100%)",
                            boxShadow: "0 3px 0 rgba(109,40,217,0.4), 0 4px 12px rgba(124,58,237,0.3)",
                          }
                        : {
                            background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                            boxShadow: "0 2px 6px rgba(253, 230, 138, 0.5)",
                          }
                      : day.isMilestone
                        ? {
                            background: "hsl(var(--background))",
                            border: "2px solid #A78BFA",
                          }
                        : isNext
                          ? {
                              background: "hsl(var(--background))",
                              border: "2px dashed hsl(var(--muted-foreground) / 0.3)",
                            }
                          : {
                              background: "hsl(var(--muted) / 0.5)",
                            }
                  }
                  whileHover={day.isMilestone ? { scale: 1.1 } : undefined}
                  whileTap={day.isMilestone ? { scale: 0.95 } : undefined}
                >
                  {day.isCompleted && day.isMilestone ? (
                    <Gift className="w-4 h-4 text-white" />
                  ) : day.isCompleted ? (
                    <Check className="w-4 h-4 text-amber-700" />
                  ) : day.isMilestone ? (
                    <Gift className="w-4 h-4 text-purple-400" />
                  ) : isNext ? (
                    <span className="text-xs font-bold text-muted-foreground">?</span>
                  ) : null}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Milestone reward modal */}
      {selectedMilestone && (
        <GameModal
          isOpen={!!selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
          variant="gold"
          fullScreen={false}
          icon={
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: selectedMilestone.isCompleted
                  ? "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)"
                  : "linear-gradient(135deg, #E9D5FF 0%, #C4B5FD 100%)",
                boxShadow: selectedMilestone.isCompleted
                  ? "0 5px 0 #5B21B6, inset 0 2px 4px rgba(255,255,255,0.3)"
                  : "0 5px 0 #A78BFA",
              }}
            >
              <Gift className={`w-8 h-8 ${selectedMilestone.isCompleted ? "text-white" : "text-purple-600"}`} />
            </div>
          }
          title={`${t("extra.streakDay")} ${selectedMilestone.dayNumber}`}
          subtitle={t("extra.streakMilestoneReward")}
        >
          <div className="text-center space-y-4">
            <div
              className="mx-auto p-4 rounded-2xl"
              style={{
                background: selectedMilestone.isCompleted
                  ? "linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)"
                  : "linear-gradient(180deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.05) 100%)",
                border: `2px solid ${selectedMilestone.isCompleted ? "rgba(34,197,94,0.3)" : "rgba(167,139,250,0.3)"}`,
              }}
            >
              <span className="text-3xl mb-2 block">
                {selectedMilestone.isCompleted ? "🎉" : "🎁"}
              </span>
              <p className="text-base font-bold text-foreground">
                {getMilestoneRewardText(selectedMilestone)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedMilestone.isCompleted
                  ? t("extra.milestoneUnlocked")
                  : t("extra.milestoneLocked", { count: selectedMilestone.dayNumber - currentStreak })}
              </p>
            </div>
          </div>
        </GameModal>
      )}
    </>
  );
}
