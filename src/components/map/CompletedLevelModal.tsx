import { motion } from "framer-motion";
import { Star, CheckCircle, Target, Zap, Calendar, RotateCcw } from "lucide-react";
import { GameModal, GameModalFooter, GameModalInfoRow } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

interface CompletedLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: number;
  stats: {
    questionsAnswered: number;
    correctAnswers: number;
    pointsEarned: number;
    starsEarned: number;
    completedAt?: string;
  };
  onReplay?: () => void;
}

export function CompletedLevelModal({ 
  isOpen, 
  onClose, 
  levelId, 
  stats,
  onReplay 
}: CompletedLevelModalProps) {
  const { t } = useLanguage();
  const accuracy = stats.questionsAnswered > 0 
    ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) 
    : 0;

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="success"
      icon={<CheckCircle className="w-10 h-10" />}
      title={t("completedLevel.levelTitle").replace("{level}", String(levelId))}
      subtitle={t("completedLevel.completed")}
      showSparkles
    >
      {/* Stars display */}
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3].map((star, i) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
          >
            <Star 
              className={`w-10 h-10 ${
                star <= stats.starsEarned 
                  ? "text-yellow-400 fill-yellow-400 drop-shadow-lg" 
                  : "text-gray-300"
              }`}
              style={{
                filter: star <= stats.starsEarned ? "drop-shadow(0 2px 4px rgba(251,191,36,0.4))" : undefined,
              }}
            />
          </motion.div>
        ))}
      </div>
      
      {/* Stats */}
      <div className="space-y-2 mb-4">
        <GameModalInfoRow
          icon={<Target className="w-5 h-5" />}
          label={t("completedLevel.bestScore")}
          value={`${stats.correctAnswers}/${stats.questionsAnswered}`}
          color="text-green-600"
        />
        <GameModalInfoRow
          icon={<CheckCircle className="w-5 h-5" />}
          label={t("completedLevel.accuracy")}
          value={`${accuracy}%`}
          color="text-green-600"
        />
        <GameModalInfoRow
          icon={<Zap className="w-5 h-5" />}
          label={t("completedLevel.pointsEarned")}
          value={stats.pointsEarned}
          color="text-green-600"
        />
        
        {stats.completedAt && (
          <GameModalInfoRow
            icon={<Calendar className="w-5 h-5" />}
            label={t("completedLevel.completedAt")}
            value={format(new Date(stats.completedAt), "MMM d, yyyy")}
            color="text-green-600"
          />
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl font-semibold text-gray-700"
          style={{ 
            background: "#F3F4F6",
            boxShadow: "0 4px 0 #D1D5DB",
            border: "2px solid #E5E7EB",
          }}
        >
          {t("completedLevel.close")}
        </button>
        {onReplay && (
          <button
            onClick={onReplay}
            className="flex-1 py-3 rounded-xl bg-gradient-to-b from-green-400 to-green-500 text-white font-bold flex items-center justify-center gap-2"
            style={{ boxShadow: "0 4px 0 rgba(22,163,74,0.5)" }}
          >
            <RotateCcw className="w-4 h-4" />
            {t("completedLevel.playAgain")}
          </button>
        )}
      </div>
    </GameModal>
  );
}
