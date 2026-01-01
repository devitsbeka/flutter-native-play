import { motion } from "framer-motion";
import { Crown, TrendingUp, Gamepad2, Gift, Flame } from "lucide-react";
import { GameModal, GameModalInfoRow } from "@/components/ui/game-modal";

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
  // Estimate XP breakdown
  const estimatedGameXP = gamesWon * 50;
  const estimatedBonusXP = Math.floor(totalPoints * 0.1);
  const estimatedStreakXP = currentStreak * 10;

  const xpSources = [
    { icon: <Gamepad2 className="w-4 h-4" />, label: "თამაშებიდან", value: `+${estimatedGameXP.toLocaleString()}`, color: "text-blue-500" },
    { icon: <Gift className="w-4 h-4" />, label: "ბონუსები", value: `+${estimatedBonusXP.toLocaleString()}`, color: "text-purple-500" },
    { icon: <Flame className="w-4 h-4" />, label: "სერიები", value: `+${estimatedStreakXP.toLocaleString()}`, color: "text-orange-500" },
  ];

  // Next milestone
  const milestones = [500, 1000, 2500, 5000, 10000, 25000, 50000];
  const nextMilestone = milestones.find((m) => m > totalPoints) || milestones[milestones.length - 1];
  const progress = Math.min(100, (totalPoints / nextMilestone) * 100);

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      icon={<Crown className="w-10 h-10" />}
      title="შენი ქულები 👑"
      showSparkles
    >
      {/* Total Points - Big Display */}
      <div 
        className="rounded-2xl p-4 mb-4 text-center"
        style={{
          background: "linear-gradient(180deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)",
          border: "2px solid rgba(251,191,36,0.3)",
          boxShadow: "0 4px 0 rgba(251,191,36,0.15)",
        }}
      >
        <motion.p
          className="text-4xl font-display font-bold text-amber-600"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
        >
          {totalPoints.toLocaleString()}
        </motion.p>
        <p className="text-sm font-medium text-amber-700">სულ XP</p>
      </div>

      {/* XP Sources */}
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          XP წყაროები
        </h3>
        {xpSources.map((source, i) => (
          <motion.div
            key={source.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GameModalInfoRow
              icon={source.icon}
              label={source.label}
              value={source.value}
              color={source.color}
            />
          </motion.div>
        ))}
      </div>

      {/* Next Milestone */}
      <div 
        className="rounded-xl p-4"
        style={{
          background: "#F9FAFB",
          border: "2px solid #E5E7EB",
          boxShadow: "0 3px 0 #E5E7EB",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">შემდეგი ეტაპი</span>
          <span className="text-sm font-bold text-gray-800">
            {totalPoints.toLocaleString()} / {nextMilestone.toLocaleString()}
          </span>
        </div>
        <div 
          className="h-3 rounded-full overflow-hidden"
          style={{ background: "#E5E7EB" }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          🏆 {nextMilestone.toLocaleString()} XP-ზე ოქროს ბეჯი!
        </p>
      </div>
    </GameModal>
  );
}
