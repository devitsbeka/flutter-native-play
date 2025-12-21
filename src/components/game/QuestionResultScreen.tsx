import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { Check, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressDots } from "./ProgressDots";

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
    lastOpponentCorrect,
  } = useGame();

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Result Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6",
          lastAnswerCorrect ? "bg-success" : "bg-destructive"
        )}
      >
        {lastAnswerCorrect ? (
          <Check className="w-10 h-10 text-success-foreground" />
        ) : (
          <X className="w-10 h-10 text-destructive-foreground" />
        )}
      </motion.div>

      {/* Result Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        <h2 className={cn(
          "text-2xl font-bold mb-2",
          lastAnswerCorrect ? "text-success" : "text-destructive"
        )}>
          {lastAnswerCorrect ? "Correct!" : "Wrong"}
        </h2>
        
        {lastAnswerCorrect && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-foreground"
          >
            +{lastPointsEarned}
          </motion.p>
        )}
      </motion.div>

      {/* Streak */}
      {streak > 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-8"
        >
          <Zap className="w-4 h-4" />
          <span className="font-semibold">{streak} Streak</span>
        </motion.div>
      )}

      {/* Progress Dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <ProgressDots
          total={questions.length}
          current={currentQuestionIndex + 1}
          userProgress={userProgress}
          opponentProgress={opponentProgress}
        />
      </motion.div>

      {/* Opponent Result */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-3 mb-8"
      >
        <span className="text-muted-foreground text-sm">Opponent:</span>
        <span className={cn(
          "text-sm font-medium",
          lastOpponentCorrect ? "text-success" : "text-destructive"
        )}>
          {lastOpponentCorrect ? "Correct" : "Wrong"}
        </span>
      </motion.div>

      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-xs glass rounded-2xl p-5 mb-8"
      >
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-foreground">{userScore}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">You</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-foreground">{opponentScore}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Opp</p>
          </div>
        </div>
        
        <div className="mt-4 h-1 bg-border rounded-full overflow-hidden flex">
          <motion.div
            className="bg-primary h-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(userScore / Math.max(userScore + opponentScore, 1)) * 100}%` 
            }}
            transition={{ delay: 0.7, duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <ChunkyButton
          variant="primary"
          size="lg"
          onClick={nextQuestion}
        >
          {isLastQuestion ? "See Results" : "Next Question"}
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
