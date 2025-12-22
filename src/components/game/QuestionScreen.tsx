import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import { ProgressDots } from "./ProgressDots";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Check, X } from "lucide-react";

export function QuestionScreen() {
  const { 
    questions, 
    currentQuestionIndex, 
    answerQuestion, 
    nextQuestion,
    timePerQuestion, 
    userScore, 
    opponentScore, 
    opponent,
    userProgress,
    opponentProgress,
    phase,
    lastAnswerCorrect,
    lastOpponentCorrect,
    lastOpponentAnswer,
    lastUserAnswer,
    lastPointsEarned,
  } = useGame();
  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [animateUserScore, setAnimateUserScore] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const showResult = phase === "question-result";

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer || showResult) return;
    setSelectedAnswer(answer);
    
    setTimeout(() => {
      answerQuestion(answer, timeRemaining);
    }, 200);
  }, [selectedAnswer, showResult, answerQuestion, timeRemaining]);

  const handleNext = useCallback(() => {
    setSelectedAnswer(null);
    nextQuestion();
  }, [nextQuestion]);

  useEffect(() => {
    if (phase === "playing") {
      setTimeRemaining(timePerQuestion);
      setSelectedAnswer(null);
    }
  }, [currentQuestionIndex, timePerQuestion, phase]);

  // Trigger bounce animation when score increases
  useEffect(() => {
    if (showResult && lastAnswerCorrect) {
      setAnimateUserScore(true);
      const timer = setTimeout(() => setAnimateUserScore(false), 500);
      return () => clearTimeout(timer);
    }
  }, [showResult, lastAnswerCorrect]);

  useEffect(() => {
    if (selectedAnswer || showResult) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          handleAnswer("");
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [selectedAnswer, showResult, handleAnswer]);

  if (!currentQuestion) return null;

  const timerPercentage = (timeRemaining / timePerQuestion) * 100;
  const category = currentQuestion.category.split(":").pop()?.trim() || currentQuestion.category;

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col py-2">
      {/* Header - Minimal single line */}
      <div className="flex items-center justify-between px-1 mb-2 flex-shrink-0">
        <span className="bg-primary/20 px-2 py-0.5 rounded-full text-xs font-medium text-primary">
          {category}
        </span>
        
        {/* Score Display - Compact with bounce */}
        <div className="flex items-center gap-2">
          <motion.div 
            className="flex items-center gap-1"
            animate={animateUserScore ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <span className="text-base">😊</span>
            <span className="text-sm font-bold text-foreground">{userScore}</span>
          </motion.div>
          <span className="text-muted-foreground text-xs">-</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-foreground">{opponentScore}</span>
            <span className="text-base">{opponent?.avatarEmoji || "🤖"}</span>
          </div>
        </div>

        <div className={cn(
          "px-2 py-0.5 rounded-full text-xs font-bold tabular-nums",
          showResult ? "bg-success/20 text-success" : 
          timerPercentage > 25 ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
        )}>
          {showResult ? "✓" : `${Math.ceil(timeRemaining)}s`}
        </div>
      </div>

      {/* Progress bar - Full width thin */}
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-3 flex-shrink-0">
        <motion.div
          className={cn(
            "h-full rounded-full",
            showResult ? "bg-success" :
            timerPercentage > 50 ? "bg-primary" : 
            timerPercentage > 25 ? "bg-quiz-yellow" : "bg-destructive"
          )}
          animate={{ width: showResult ? "100%" : `${timerPercentage}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Question Content */}
      <div className="bg-background/95 backdrop-blur-lg rounded-2xl p-4 flex-1 flex flex-col shadow-xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col h-full"
          >
            {/* Result Banner */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "mb-3 py-2 rounded-xl flex items-center justify-center gap-2 flex-shrink-0",
                  lastAnswerCorrect ? "bg-success/10" : "bg-destructive/10"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  lastAnswerCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                )}>
                  {lastAnswerCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                </div>
                <span className={cn(
                  "font-bold text-sm",
                  lastAnswerCorrect ? "text-success" : "text-destructive"
                )}>
                  {lastAnswerCorrect ? `+${lastPointsEarned} points!` : "Wrong!"}
                </span>
              </motion.div>
            )}

            {/* Question */}
            <div className="mb-4 flex-shrink-0">
              <span className={cn(
                "inline-block px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide mb-2",
                currentQuestion.difficulty === "easy" && "bg-success/10 text-success",
                currentQuestion.difficulty === "medium" && "bg-primary/10 text-primary",
                currentQuestion.difficulty === "hard" && "bg-destructive/10 text-destructive"
              )}>
                {currentQuestion.difficulty}
              </span>
              <p className="text-xl font-bold text-foreground leading-snug">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answers - Larger touch targets */}
            <div className="flex-1 flex flex-col gap-2.5 min-h-0">
              {currentQuestion.allAnswers.map((answer, index) => {
                const isSelected = selectedAnswer === answer || lastUserAnswer === answer;
                const isCorrect = answer === currentQuestion.correctAnswer;
                const isOpponentAnswer = showResult && lastOpponentAnswer === answer;
                const letters = ["A", "B", "C", "D"];

                let buttonStyle = "bg-card border-border hover:border-primary/50 active:scale-[0.98]";
                let letterStyle = "bg-secondary text-foreground";
                
                if (showResult) {
                  if (isCorrect) {
                    buttonStyle = "bg-success/10 border-success";
                    letterStyle = "bg-success text-success-foreground";
                  } else if (isSelected && !isCorrect) {
                    buttonStyle = "bg-destructive/10 border-destructive";
                    letterStyle = "bg-destructive text-destructive-foreground";
                  } else if (isOpponentAnswer && !isCorrect) {
                    buttonStyle = "bg-destructive/5 border-destructive/50";
                  }
                } else if (isSelected) {
                  buttonStyle = "bg-primary border-primary text-primary-foreground";
                  letterStyle = "bg-primary-foreground/20 text-primary-foreground";
                }

                return (
                  <motion.button
                    key={answer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAnswer(answer)}
                    disabled={!!selectedAnswer || showResult}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl text-left transition-all border-2 relative flex-shrink-0",
                      "disabled:cursor-not-allowed min-h-[56px]",
                      buttonStyle
                    )}
                  >
                    <span
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0",
                        letterStyle
                      )}
                    >
                      {showResult && isCorrect ? (
                        <Check className="w-5 h-5" />
                      ) : showResult && isSelected && !isCorrect ? (
                        <X className="w-5 h-5" />
                      ) : (
                        letters[index]
                      )}
                    </span>
                    <span className={cn(
                      "flex-1 font-semibold",
                      showResult && isCorrect && "text-success",
                      showResult && isSelected && !isCorrect && "text-destructive"
                    )}>
                      {answer}
                    </span>

                    {isOpponentAnswer && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-sm border",
                          lastOpponentCorrect 
                            ? "bg-success/20 border-success" 
                            : "bg-destructive/20 border-destructive"
                        )}>
                          {opponent?.avatarEmoji || "🤖"}
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Next Button */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-3 flex-shrink-0"
              >
                <ChunkyButton
                  variant="primary"
                  size="lg"
                  onClick={handleNext}
                  className="w-full"
                >
                  {currentQuestionIndex < questions.length - 1 ? "Next Question" : "See Results"}
                </ChunkyButton>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
