import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { Check, X, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { BoardGameMap } from "./BoardGameMap";

export function QuestionResultScreen() {
  const { 
    lastAnswerCorrect, 
    lastPointsEarned, 
    streak, 
    nextQuestion, 
    currentQuestionIndex, 
    questions,
    userScore,
    opponentScore,
    userProgress,
    opponentProgress,
    userAnswerHistory,
    opponentAnswerHistory,
    lastOpponentCorrect,
  } = useGame();

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-gradient-to-b from-background via-background to-primary/10">
      {/* Result Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mb-4",
          lastAnswerCorrect 
            ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" 
            : "bg-destructive shadow-lg shadow-destructive/30"
        )}
      >
        {lastAnswerCorrect ? (
          <Check className="w-12 h-12 text-white" />
        ) : (
          <X className="w-12 h-12 text-white" />
        )}
      </motion.div>

      {/* Result Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-4"
      >
        <h2 className={cn(
          "text-2xl font-bold mb-1",
          lastAnswerCorrect ? "text-emerald-500" : "text-destructive"
        )}>
          {lastAnswerCorrect ? "Correct!" : "Wrong!"}
        </h2>
        
        {lastAnswerCorrect && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex items-center justify-center gap-2"
          >
            <span className="text-3xl font-bold text-primary">
              +{lastPointsEarned}
            </span>
            <span className="text-muted-foreground">points</span>
          </motion.div>
        )}
      </motion.div>

      {/* Streak Indicator */}
      {streak > 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2 bg-yellow-500/20 text-yellow-600 px-4 py-2 rounded-full mb-4"
        >
          <Zap className="w-5 h-5" />
          <span className="font-bold">{streak} Streak!</span>
          <span className="text-sm">+{Math.min(streak, 5) * 5}% bonus</span>
        </motion.div>
      )}

      {/* Board Game Map - Expanded */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full mb-4"
      >
        <BoardGameMap
          totalTiles={questions.length}
          userProgress={userProgress}
          opponentProgress={opponentProgress}
          userAnswerHistory={userAnswerHistory}
          opponentAnswerHistory={opponentAnswerHistory}
          animateLastMove
        />
      </motion.div>

      {/* Opponent Result */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 mb-4 text-sm"
      >
        <span className="text-muted-foreground">Opponent:</span>
        <span className={cn(
          "font-medium",
          lastOpponentCorrect ? "text-emerald-500" : "text-destructive"
        )}>
          {lastOpponentCorrect ? "Correct ✓" : "Wrong ✗"}
        </span>
      </motion.div>

      {/* Score Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-sm bg-card rounded-2xl p-4 mb-6 border border-border"
      >
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-primary">{userScore}</p>
            <p className="text-sm text-muted-foreground">You</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-destructive">{opponentScore}</p>
            <p className="text-sm text-muted-foreground">Opponent</p>
          </div>
        </div>
        
        {/* Score bar visualization */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden flex">
          <motion.div
            className="bg-primary h-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(userScore / (userScore + opponentScore || 1)) * 100}%` 
            }}
            transition={{ delay: 0.8, duration: 0.5 }}
          />
          <motion.div
            className="bg-destructive h-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(opponentScore / (userScore + opponentScore || 1)) * 100}%` 
            }}
            transition={{ delay: 0.8, duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <ChunkyButton
          variant="primary"
          size="lg"
          onClick={nextQuestion}
          icon={<ArrowRight className="w-5 h-5" />}
        >
          {isLastQuestion ? "See Results" : "Next Question"}
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
