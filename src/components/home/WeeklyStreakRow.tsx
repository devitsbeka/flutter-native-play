import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Gift, Flame, Check, X, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { GameModal } from "@/components/ui/game-modal";
import { getStreakMilestones } from "@/utils/levelCalculation";

const WEEKDAY_KEYS = [
  "weekdayMon", "weekdaeTue", "weekdayWed", "weekdayThu",
  "weekdayFri", "weekdaySat", "weekdaySun",
] as const;

// JS getDay(): 0=Sun,1=Mon...6=Sat → convert to 0=Mon...6=Sun
function jsDayToMonday(jsDay: number) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

interface GiftMilestone {
  afterDay: number; // appears after this streak day
  bonus: number;
  rewardKey: string;
  isUnlocked: boolean;
}

export function WeeklyStreakRow({ onNewClick }: { onNewClick?: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedGift, setSelectedGift] = useState<GiftMilestone | null>(null);

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

  // Build the scrollable timeline: past weeks + current week + future weeks
  const timeline = useMemo(() => {
    const today = new Date();
    const todayMondayIdx = jsDayToMonday(today.getDay());

    // How many full weeks of streak behind us (plus current partial week)
    const totalWeeks = Math.max(Math.ceil(currentStreak / 7) + 1, 3);

    // Start date = beginning of the earliest week we want to show
    const startDate = new Date(today);
    // Go back to Monday of current week
    startDate.setDate(startDate.getDate() - todayMondayIdx);
    // Then go back (totalWeeks - 1) more weeks
    startDate.setDate(startDate.getDate() - (totalWeeks - 1) * 7);

    const days: { date: Date; weekdayKey: string; isToday: boolean; isCompleted: boolean; dayIndex: number }[] = [];
    
    for (let i = 0; i < totalWeeks * 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const mondayIdx = jsDayToMonday(d.getDay());
      const isToday = d.toDateString() === today.toDateString();
      
      // A day is completed if it's within the streak window (today and previous streak days)
      const daysAgo = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const isCompleted = daysAgo >= 0 && daysAgo < currentStreak;

      days.push({
        date: d,
        weekdayKey: WEEKDAY_KEYS[mondayIdx],
        isToday,
        isCompleted,
        dayIndex: i,
      });
    }

    return days;
  }, [currentStreak]);

  // Gift milestones every 5 days of streak
  const milestones = useMemo(() => {
    const streakMilestones = getStreakMilestones();
    const gifts: GiftMilestone[] = [];
    
    // Show milestones at 5, 10, 15, 20, 25, 30
    for (let d = 5; d <= Math.max(currentStreak + 10, 30); d += 5) {
      const milestone = streakMilestones.find(m => m.days === d);
      let rewardKey = "milestoneXpBonus";
      let bonus = milestone?.bonus ?? 25;
      if (d >= 30) { rewardKey = "milestoneDoubleXp"; }
      else if (d >= 10) { rewardKey = "milestoneXpBonusGift"; }
      
      gifts.push({
        afterDay: d,
        bonus,
        rewardKey,
        isUnlocked: currentStreak >= d,
      });
    }
    return gifts;
  }, [currentStreak]);

  if (!user) return null;

  function getMilestoneRewardText(gift: GiftMilestone): string {
    if (gift.rewardKey === "milestoneDoubleXp") {
      return t(`extra.${gift.rewardKey}`);
    }
    return t(`extra.${gift.rewardKey}`, { percent: gift.bonus });
  }

  // Find today's index to auto-scroll there
  const todayIndex = timeline.findIndex(d => d.isToday);

  // Insert gift icons between day groups in the render
  // Gift appears after every 5th streak day
  const giftAfterDays = new Set(milestones.map(m => m.afterDay));

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
          ref={(el) => {
            (scrollRef as any).current = el;
            // Auto-scroll to today
            if (el && todayIndex >= 0) {
              const scrollTo = Math.max(0, todayIndex * 52 - el.clientWidth / 2 + 26);
              el.scrollLeft = scrollTo;
            }
          }}
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          {timeline.map((day, i) => {
            // Check if a gift milestone should appear after this day
            // We track streak days completed. If streak = N, the Nth completed day
            // triggers a gift if N is a multiple of 5.
            // Render gift after the day circle that marks the 5th, 10th etc completed day.
            const today = new Date();
            const daysAgo = Math.floor((today.getTime() - day.date.getTime()) / (1000 * 60 * 60 * 24));
            // This day's streak position (1-based) = currentStreak - daysAgo
            const streakPosition = day.isCompleted ? currentStreak - daysAgo : 0;
            const giftMilestone = streakPosition > 0 && streakPosition % 5 === 0
              ? milestones.find(m => m.afterDay === streakPosition)
              : null;

            return (
              <div key={i} className="flex items-end gap-1.5">
                <motion.div
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.4), type: "spring", stiffness: 300 }}
                >
                  {/* Weekday label */}
                  <span className={`text-[10px] font-semibold ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {t(`extra.${day.weekdayKey}`)}
                  </span>

                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center relative ${
                      day.isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={
                      day.isCompleted
                        ? {
                            background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                            boxShadow: "0 2px 6px rgba(253, 230, 138, 0.5)",
                          }
                        : {
                            background: "hsl(var(--muted))",
                            border: "2px solid hsl(var(--border))",
                          }
                    }
                  >
                    {day.isCompleted ? (
                      <Check className="w-4 h-4 text-amber-700" />
                    ) : day.isToday ? (
                      <span className="text-xs font-bold text-primary">?</span>
                    ) : day.date < new Date(new Date().toDateString()) ? (
                      <X className="w-4 h-4 text-muted-foreground/60" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Today indicator dot */}
                  {day.isToday && (
                    <span className="text-[8px] font-bold text-primary mt-0.5">
                      {t("extra.today")}
                    </span>
                  )}
                </motion.div>

                {/* Gift milestone circle after every 5th streak day */}
                {giftMilestone && (
                  <motion.div
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                  >
                    <span className="text-[10px] font-semibold text-purple-400">🎁</span>
                    <motion.button
                      onClick={() => setSelectedGift(giftMilestone)}
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={
                        giftMilestone.isUnlocked
                          ? {
                              background: "linear-gradient(180deg, #A78BFA 0%, #7C3AED 100%)",
                              boxShadow: "0 3px 0 rgba(109,40,217,0.4), 0 4px 12px rgba(124,58,237,0.3)",
                            }
                          : {
                              background: "hsl(var(--background))",
                              border: "2px solid #A78BFA",
                            }
                      }
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Gift className={`w-4 h-4 ${giftMilestone.isUnlocked ? "text-white" : "text-purple-400"}`} />
                    </motion.button>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Gift milestone modal */}
      {selectedGift && (
        <GameModal
          isOpen={!!selectedGift}
          onClose={() => setSelectedGift(null)}
          variant="gold"
          fullScreen={false}
          icon={
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: selectedGift.isUnlocked
                  ? "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)"
                  : "linear-gradient(135deg, #E9D5FF 0%, #C4B5FD 100%)",
                boxShadow: selectedGift.isUnlocked
                  ? "0 5px 0 #5B21B6, inset 0 2px 4px rgba(255,255,255,0.3)"
                  : "0 5px 0 #A78BFA",
              }}
            >
              <Gift className={`w-8 h-8 ${selectedGift.isUnlocked ? "text-white" : "text-purple-600"}`} />
            </div>
          }
          title={t("extra.streakGiftReward")}
          subtitle={`${selectedGift.afterDay} ${t("extra.daysLabel", { count: selectedGift.afterDay }).replace(String(selectedGift.afterDay), "").trim()}`}
        >
          <div className="text-center space-y-4">
            <div
              className="mx-auto p-4 rounded-2xl"
              style={{
                background: selectedGift.isUnlocked
                  ? "linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)"
                  : "linear-gradient(180deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.05) 100%)",
                border: `2px solid ${selectedGift.isUnlocked ? "rgba(34,197,94,0.3)" : "rgba(167,139,250,0.3)"}`,
              }}
            >
              <span className="text-3xl mb-2 block">
                {selectedGift.isUnlocked ? "🎉" : "🎁"}
              </span>
              <p className="text-base font-bold text-foreground">
                {getMilestoneRewardText(selectedGift)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedGift.isUnlocked
                  ? t("extra.milestoneUnlocked")
                  : t("extra.milestoneLocked", { count: selectedGift.afterDay - currentStreak })}
              </p>
            </div>
          </div>
        </GameModal>
      )}
    </>
  );
}
