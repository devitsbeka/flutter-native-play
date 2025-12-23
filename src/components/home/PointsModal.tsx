import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, TrendingUp, Gamepad2, Gift, Flame } from "lucide-react";

interface PointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPoints: number;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
}

export function PointsModal({
  isOpen,
  onClose,
  totalPoints,
  gamesPlayed,
  gamesWon,
  currentStreak,
}: PointsModalProps) {
  // Estimate XP breakdown (these would be from actual tracking)
  const estimatedGameXP = gamesWon * 50;
  const estimatedBonusXP = Math.floor(totalPoints * 0.1);
  const estimatedStreakXP = currentStreak * 10;

  const xpSources = [
    { icon: Gamepad2, label: "თამაშებიდან", value: estimatedGameXP, color: "text-blue-500" },
    { icon: Gift, label: "ბონუსები", value: estimatedBonusXP, color: "text-purple-500" },
    { icon: Flame, label: "სერიები", value: estimatedStreakXP, color: "text-orange-500" },
  ];

  // Next milestone
  const milestones = [500, 1000, 2500, 5000, 10000, 25000, 50000];
  const nextMilestone = milestones.find((m) => m > totalPoints) || milestones[milestones.length - 1];
  const progress = Math.min(100, (totalPoints / nextMilestone) * 100);

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
                style={{ background: "linear-gradient(135deg, hsl(45 90% 50%), hsl(35 90% 45%))" }}
                initial={{ rotate: -10 }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Crown className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-display font-bold text-foreground">
                შენი ქულები 👑
              </h2>
            </div>

            {/* Total Points */}
            <div className="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-2xl p-4 mb-4 text-center">
              <motion.p
                className="text-4xl font-display font-bold text-amber-600 dark:text-amber-400"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
              >
                {totalPoints.toLocaleString()}
              </motion.p>
              <p className="text-sm text-amber-700 dark:text-amber-300">სულ XP</p>
            </div>

            {/* XP Sources */}
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                XP წყაროები
              </h3>
              {xpSources.map((source, i) => (
                <motion.div
                  key={source.label}
                  className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-2">
                    <source.icon className={`w-4 h-4 ${source.color}`} />
                    <span className="text-sm text-foreground">{source.label}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    +{source.value.toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Next Milestone */}
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">შემდეგი ეტაპი</span>
                <span className="text-sm font-bold text-foreground">
                  {totalPoints.toLocaleString()} / {nextMilestone.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-background rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(45 90% 50%), hsl(35 90% 55%))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                🏆 {nextMilestone.toLocaleString()} XP-ზე ოქროს ბეჯი!
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
