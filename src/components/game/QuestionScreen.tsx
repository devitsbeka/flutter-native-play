import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import { ProgressDots } from "./ProgressDots";
import { Avatar } from "@/components/shared/Avatar";
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
      {/* Header Section - Ultra Compact */}
      <div className="bg-primary/80 backdrop-blur-lg rounded-2xl px-3 py-2 mb-2 flex-shrink-0">
        {/* Single row: Category - Scores - Timer */}
        <div className="flex items-center justify-between mb-2">
          <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs font-medium text-primary-foreground">
            {category}
          </span>
          
          {/* Score Display - Inline */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-lg">😊</span>
              <p className="text-base font-bold text-primary-foreground">{userScore}</p>
            </div>
            <div className="text-primary-foreground/50 font-bold text-xs">VS</div>
            <div className="flex items-center gap-1">
              <p className="text-base font-bold text-primary-foreground">{opponentScore}</p>
              <span className="text-lg">{opponent?.avatarEmoji || "🤖"}</span>
            </div>
          </div>

          <div className="bg-primary-foreground/20 px-2 py-0.5 rounded-full">
            <span className={cn(
              "text-xs font-bold tabular-nums",
              showResult ? "text-primary-foreground" : timerPercentage > 25 ? "text-primary-foreground" : "text-quiz-coral"
            )}>
              {showResult ? "✓" : `${Math.ceil(timeRemaining)}s`}
            </span>
          </div>
        </div>

        {/* Progress Dots + Timer bar in one row */}
        <div className="flex items-center gap-3">
          <ProgressDots
            total={questions.length}
            current={currentQuestionIndex}
            userProgress={userProgress}
            opponentProgress={opponentProgress}
          />
          <div className="flex-1 h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                showResult ? "bg-primary-foreground" :
                timerPercentage > 50 ? "bg-primary-foreground" : 
                timerPercentage > 25 ? "bg-quiz-yellow" : "bg-quiz-coral"
              )}
              animate={{ width: showResult ? "100%" : `${timerPercentage}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </div>

      {/* Question Content - Flex to fill remaining space */}
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
            {/* Result Banner - Compact */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "mb-3 p-2 rounded-xl flex items-center justify-center gap-2 flex-shrink-0",
                  lastAnswerCorrect ? "bg-success/10" : "bg-destructive/10"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  lastAnswerCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                )}>
                  {lastAnswerCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                <span className={cn(
                  "font-bold",
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

            {/* Answers - Fill remaining space */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              {currentQuestion.allAnswers.map((answer, index) => {
                const isSelected = selectedAnswer === answer || lastUserAnswer === answer;
                const isCorrect = answer === currentQuestion.correctAnswer;
                const isOpponentAnswer = showResult && lastOpponentAnswer === answer;
                const letters = ["A", "B", "C", "D"];

                let buttonStyle = "bg-card border-border hover:border-primary/50";
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
                      "flex items-center gap-3 p-3 rounded-xl text-left transition-all border-2 relative flex-shrink-0",
                      "disabled:cursor-not-allowed",
                      buttonStyle
                    )}
                  >
                    <span
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0",
                        letterStyle
                      )}
                    >
                      {showResult && isCorrect ? (
                        <Check className="w-4 h-4" />
                      ) : showResult && isSelected && !isCorrect ? (
                        <X className="w-4 h-4" />
                      ) : (
                        letters[index]
                      )}
                    </span>
                    <span className={cn(
                      "flex-1 font-medium text-sm",
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
                        className="flex items-center gap-1"
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-sm border",
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

            {/* Next Button - Fixed at bottom */}
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
