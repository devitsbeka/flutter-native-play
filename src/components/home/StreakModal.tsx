import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, Calendar, Award } from "lucide-react";
import { getStreakMilestones, getStreakBonus } from "@/utils/levelCalculation";

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  bestStreak: number;
}

export function StreakModal({ isOpen, onClose, currentStreak, bestStreak }: StreakModalProps) {
  const milestones = getStreakMilestones();
  const currentBonus = getStreakBonus(currentStreak);

  // Generate last 7 days
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      day: date.toLocaleDateString("ka-GE", { weekday: "short" }),
      isActive: i >= 7 - currentStreak,
    };
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 bg-background rounded-3xl p-6 w-full max-w-sm overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
                style={{ background: "linear-gradient(135deg, hsl(25 90% 55%), hsl(35 90% 50%))" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-display font-bold text-foreground">
                {currentStreak} დღიანი სერია! 🔥
              </h2>
              {currentBonus > 0 && (
                <p className="text-sm text-primary font-medium mt-1">
                  +{currentBonus}% XP ბონუსი აქტიურია!
                </p>
              )}
            </div>

            {/* Week Calendar */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">ბოლო 7 დღე</span>
              </div>
              <div className="flex justify-between gap-1">
                {last7Days.map((day, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 py-2 rounded-lg text-center ${
                      day.isActive
                        ? "bg-gradient-to-b from-orange-400 to-orange-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className="text-xs font-medium">{day.day}</span>
                    {day.isActive && <div className="text-sm mt-0.5">🔥</div>}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{currentStreak}</p>
                <p className="text-xs text-muted-foreground">მიმდინარე</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <Award className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{bestStreak}</p>
                <p className="text-xs text-muted-foreground">საუკეთესო</p>
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>🎯</span>
                სერიის ეტაპები
              </h3>
              {milestones.map((milestone, i) => {
                const isReached = currentStreak >= milestone.days;
                const isNext = !isReached && (i === 0 || currentStreak >= milestones[i - 1].days);
                return (
                  <motion.div
                    key={milestone.days}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isReached
                        ? "bg-green-100 dark:bg-green-900/30"
                        : isNext
                        ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                        : "bg-muted/30"
                    }`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isReached ? "text-green-500" : "text-muted-foreground"}>
                        {isReached ? "✓" : `${milestone.days} დღე`}
                      </span>
                      <span className="text-sm text-foreground">{milestone.reward}</span>
                    </div>
                    {isNext && (
                      <span className="text-xs text-orange-500 font-medium">
                        {milestone.days - currentStreak} დღე დარჩა
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
