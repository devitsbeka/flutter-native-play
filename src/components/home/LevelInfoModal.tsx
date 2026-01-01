import { motion } from "framer-motion";
import { TrendingUp, Gift, Play } from "lucide-react";
import { GameModal, GameModalStat } from "@/components/ui/game-modal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { LevelInfo, getLevelRewards } from "@/utils/levelCalculation";

interface LevelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelInfo: LevelInfo;
  onContinue?: () => void;
}

export function LevelInfoModal({ isOpen, onClose, levelInfo, onContinue }: LevelInfoModalProps) {
  const nextLevelRewards = getLevelRewards(levelInfo.level + 1);

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="info"
      title={`დონე ${levelInfo.level}`}
      subtitle={levelInfo.isMaxLevel ? "✨ მაქსიმალური დონე!" : undefined}
      showSparkles
    >
      {/* Continue Playing Button */}
      {onContinue && !levelInfo.isMaxLevel && (
        <div className="mb-4">
          <ChunkyButton
            variant="primary"
            size="md"
            onClick={onContinue}
            icon={<Play className="w-5 h-5" />}
            className="w-full"
          >
            თამაშის გაგრძელება
          </ChunkyButton>
        </div>
      )}
      {/* XP Progress */}
      <div 
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "#F9FAFB",
          border: "2px solid #E5E7EB",
          boxShadow: "0 3px 0 #E5E7EB",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">XP პროგრესი</span>
          <span className="text-sm font-bold text-gray-800">
            {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel}
          </span>
        </div>
        <div 
          className="h-3 rounded-full overflow-hidden"
          style={{ background: "#E5E7EB" }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {levelInfo.isMaxLevel
            ? "შენ მიაღწიე მაქსიმალურ დონეს! 🎉"
            : `დარჩა ${levelInfo.xpNeededForNextLevel - levelInfo.xpInCurrentLevel} XP შემდეგ დონემდე`}
        </p>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <GameModalStat
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          value={levelInfo.currentXP}
          label="სულ XP"
        />
        <GameModalStat
          icon={<Gift className="h-5 w-5 text-amber-500" />}
          value={levelInfo.isMaxLevel ? "✓" : levelInfo.level + 1}
          label={levelInfo.isMaxLevel ? "მაქსიმუმი" : "შემდეგი დონე"}
          highlight={!levelInfo.isMaxLevel}
        />
      </div>

      {/* Next Level Rewards */}
      {!levelInfo.isMaxLevel && (
        <div 
          className="rounded-xl p-4"
          style={{
            background: "linear-gradient(180deg, rgba(251,191,36,0.1) 0%, rgba(234,179,8,0.05) 100%)",
            border: "2px solid rgba(251,191,36,0.3)",
            boxShadow: "0 3px 0 rgba(251,191,36,0.15)",
          }}
        >
          <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
            <span>🎁</span>
            დონე {levelInfo.level + 1}-ის ჯილდოები
          </h3>
          <div className="space-y-1.5">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              +{nextLevelRewards.xpBonus} XP ბონუსი
            </p>
            {nextLevelRewards.powerUps > 0 && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                +{nextLevelRewards.powerUps} Power-Ups
              </p>
            )}
            {nextLevelRewards.spinTickets > 0 && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                +{nextLevelRewards.spinTickets} Spin Tickets
              </p>
            )}
            {nextLevelRewards.specialRewards.map((reward, i) => (
              <p key={i} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                {reward}
              </p>
            ))}
          </div>
        </div>
      )}
    </GameModal>
  );
}
