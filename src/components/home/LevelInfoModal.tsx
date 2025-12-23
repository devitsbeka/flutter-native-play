import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Gift } from "lucide-react";
import { LevelInfo, getLevelRewards } from "@/utils/levelCalculation";

interface LevelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelInfo: LevelInfo;
}

export function LevelInfoModal({ isOpen, onClose, levelInfo }: LevelInfoModalProps) {
  const nextLevelRewards = getLevelRewards(levelInfo.level + 1);

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
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-3"
                style={{
                  background: "radial-gradient(circle, hsl(195 80% 85%) 0%, hsl(195 70% 70%) 100%)",
                  boxShadow: "0 8px 24px hsl(195 70% 40% / 0.25)",
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
              >
                <span className="text-3xl font-display font-bold text-slate-800">
                  {levelInfo.level}
                </span>
              </motion.div>
              <h2 className="text-xl font-display font-bold text-foreground">
                დონე {levelInfo.level}
              </h2>
              {levelInfo.isMaxLevel && (
                <p className="text-sm text-amber-500 font-medium mt-1">
                  ✨ მაქსიმალური დონე!
                </p>
              )}
            </div>

            {/* XP Progress */}
            <div className="bg-muted rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">XP პროგრესი</span>
                <span className="text-sm font-bold text-foreground">
                  {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel}
                </span>
              </div>
              <div className="h-3 bg-background rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(195 80% 50%), hsl(195 70% 60%))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {levelInfo.isMaxLevel
                  ? "შენ მიაღწიე მაქსიმალურ დონეს! 🎉"
                  : `დარჩა ${levelInfo.xpNeededForNextLevel - levelInfo.xpInCurrentLevel} XP შემდეგ დონემდე`}
              </p>
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{levelInfo.currentXP}</p>
                <p className="text-xs text-muted-foreground">სულ XP</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <Gift className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">
                  {levelInfo.isMaxLevel ? "✓" : levelInfo.level + 1}
                </p>
                <p className="text-xs text-muted-foreground">
                  {levelInfo.isMaxLevel ? "მაქსიმუმი" : "შემდეგი დონე"}
                </p>
              </div>
            </div>

            {/* Next Level Rewards */}
            {!levelInfo.isMaxLevel && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span>🎁</span>
                  დონე {levelInfo.level + 1}-ის ჯილდოები
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    +{nextLevelRewards.xpBonus} XP ბონუსი
                  </p>
                  {nextLevelRewards.powerUps > 0 && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      +{nextLevelRewards.powerUps} Power-Ups
                    </p>
                  )}
                  {nextLevelRewards.spinTickets > 0 && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      +{nextLevelRewards.spinTickets} Spin Tickets
                    </p>
                  )}
                  {nextLevelRewards.specialRewards.map((reward, i) => (
                    <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      {reward}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
