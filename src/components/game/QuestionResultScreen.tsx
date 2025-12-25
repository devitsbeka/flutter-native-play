import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { Check, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressDots } from "./ProgressDots";
import { Avatar } from "@/components/shared/Avatar";

export function QuestionResultScreen() {
  const { profile } = useAuth();
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
    opponent,
  } = useGame();

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Purple Header */}
      <div className={cn(
        "pt-12 pb-24 px-6 text-center",
        lastAnswerCorrect ? "gradient-purple" : "bg-destructive"
      )}>
        {/* Result Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 mx-auto rounded-full bg-primary-foreground/20 flex items-center justify-center mb-4"
        >
          {lastAnswerCorrect ? (
            <Check className="w-10 h-10 text-primary-foreground" />
          ) : (
            <X className="w-10 h-10 text-destructive-foreground" />
          )}
        </motion.div>

        {/* Result Text */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-primary-foreground mb-2"
        >
          {lastAnswerCorrect ? "Correct!" : "Wrong!"}
        </motion.h2>

        {lastAnswerCorrect && (
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-4xl font-bold text-primary-foreground"
          >
            +{lastPointsEarned}
          </motion.p>
        )}

        {/* Streak Badge */}
        {streak > 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-primary-foreground/20 text-primary-foreground px-4 py-2 rounded-full mt-4"
          >
            <Zap className="w-4 h-4" />
            <span className="font-bold">{streak} Streak!</span>
          </motion.div>
        )}
      </div>

      {/* White Content Area */}
      <div className="flex-1 bg-background rounded-t-[2rem] -mt-6 relative z-10 p-6">
        {/* Score Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-3xl p-6 mb-6 shadow-md"
        >
          <div className="flex items-center justify-between">
            {/* You */}
            <div className="flex items-center gap-3">
              <Avatar imageUrl={profile?.avatar_url || undefined} emoji="😊" size="md" />
              <div>
                <p className="font-bold text-foreground">You</p>
                <p className="text-2xl font-bold text-primary">{userScore}</p>
              </div>
            </div>

            <div className="text-muted-foreground font-bold text-sm">VS</div>

            {/* Opponent */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-bold text-foreground">{opponent?.name}</p>
                <p className="text-2xl font-bold text-foreground">{opponentScore}</p>
              </div>
              <Avatar emoji={opponent?.avatarEmoji || "🤖"} size="md" />
            </div>
          </div>

          {/* Score Bar */}
          <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden flex">
            <motion.div
              className="bg-primary h-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(userScore / Math.max(userScore + opponentScore, 1)) * 100}%` 
              }}
              transition={{ delay: 0.5, duration: 0.5 }}
            />
          </div>

          {/* Opponent Result */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-muted-foreground text-sm">Opponent:</span>
            <span className={cn(
              "text-sm font-bold",
              lastOpponentCorrect ? "text-success" : "text-destructive"
            )}>
              {lastOpponentCorrect ? "✓ Correct" : "✗ Wrong"}
            </span>
          </div>
        </motion.div>

        {/* Progress Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center mb-8"
        >
          <ProgressDots
            total={questions.length}
            current={currentQuestionIndex + 1}
            userProgress={userProgress}
            opponentProgress={opponentProgress}
          />
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <ChunkyButton
            variant="primary"
            size="xl"
            onClick={nextQuestion}
            className="w-full max-w-xs"
          >
            {isLastQuestion ? "See Results" : "Next Question"}
          </ChunkyButton>
        </motion.div>
      </div>
    </div>
  );
}
