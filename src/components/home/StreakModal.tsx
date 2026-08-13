import { motion } from "framer-motion";
import { Flame, Calendar, Award } from "lucide-react";
import { GameModal, GameModalStat } from "@/components/ui/game-modal";
import { getStreakMilestones, getStreakBonus } from "@/utils/levelCalculation";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatWeekdayShort } from "@/utils/localDate";

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  bestStreak: number;
}

export function StreakModal({ isOpen, onClose, currentStreak, bestStreak }: StreakModalProps) {
  const { t, language } = useLanguage();
  const milestones = getStreakMilestones();
  const currentBonus = getStreakBonus(currentStreak);

  const today = new Date();
  // Georgian weekday names come from localDate, not Intl — the browser has
  // no Georgian locale data and answers with English rather than an error,
  // so this strip read Mon/Tue/Wed to Georgian players.
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      day: formatWeekdayShort(date, language),
      isActive: i >= 7 - currentStreak,
    };
  });

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      icon={<Flame className="w-10 h-10" />}
      title={t("extra.streakDays", { count: currentStreak })}
      subtitle={currentBonus > 0 ? t("extra.xpBonusActive", { percent: currentBonus }) : undefined}
      showSparkles
    >
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-600">{t("extra.last7Days")}</span>
        </div>
        <div className="flex justify-between gap-1">
          {last7Days.map((day, i) => (
            <motion.div
              key={i}
              className="flex-1 py-2 rounded-xl text-center"
              style={{
                background: day.isActive
                  ? "linear-gradient(180deg, #F97316 0%, #EA580C 100%)"
                  : "#F3F4F6",
                color: day.isActive ? "white" : "#6B7280",
                boxShadow: day.isActive 
                  ? "0 3px 0 rgba(234,88,12,0.4)"
                  : "0 2px 0 #E5E7EB",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05, type: "spring" }}
            >
              <span className="text-[10px] font-bold">{day.day}</span>
              {day.isActive && (
                <motion.div 
                  className="text-sm mt-0.5"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  🔥
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <GameModalStat
          icon={<Flame className="h-5 w-5 text-orange-400" />}
          value={currentStreak}
          label={t("extra.currentLabel")}
        />
        <GameModalStat
          icon={<Award className="h-5 w-5 text-amber-500" />}
          value={bestStreak}
          label={t("extra.bestLabel")}
          highlight
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>🎯</span>
          {t("extra.streakMilestones")}
        </h3>
        {milestones.map((milestone, i) => {
          const isReached = currentStreak >= milestone.days;
          const isNext = !isReached && (i === 0 || currentStreak >= milestones[i - 1].days);
          return (
            <motion.div
              key={milestone.days}
              className="flex items-center justify-between p-2.5 rounded-xl"
                style={{
                  background: isReached
                    ? "linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)"
                    : isNext
                      ? "linear-gradient(180deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.05) 100%)"
                      : "#F9FAFB",
                  border: `2px solid ${isReached ? "rgba(34,197,94,0.3)" : isNext ? "rgba(249,115,22,0.3)" : "#E5E7EB"}`,
                boxShadow: isReached || isNext ? "0 2px 0 rgba(0,0,0,0.05)" : "none",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-2">
                <span className={isReached ? "text-green-500" : "text-gray-500"}>
                  {isReached ? "✓" : t("extra.daysLabel", { count: milestone.days })}
                </span>
                <span className="text-sm font-medium text-gray-800">{milestone.reward}</span>
              </div>
              {isNext && (
                <span className="text-xs font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-lg">
                  {t("extra.daysLeft", { count: milestone.days - currentStreak })}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </GameModal>
  );
}
