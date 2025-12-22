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
    <div className="w-full max-w-md mx-auto flex flex-col">
      {/* Header Section - Glassmorphism style */}
      <div className="bg-primary/80 backdrop-blur-lg rounded-3xl p-6 mb-4">
        {/* Top bar - Timer & Category */}
        <div className="flex items-center justify-between mb-4">
          <span className="bg-primary-foreground/20 px-4 py-1.5 rounded-full text-sm font-medium text-primary-foreground">
            {category}
          </span>
          <div className="bg-primary-foreground/20 px-4 py-1.5 rounded-full">
            <span className={cn(
              "text-sm font-bold tabular-nums",
              showResult ? "text-primary-foreground" : timerPercentage > 25 ? "text-primary-foreground" : "text-quiz-coral"
            )}>
              {showResult ? "✓" : `${Math.ceil(timeRemaining)}s`}
            </span>
          </div>
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <Avatar emoji="😊" size="sm" />
            <div className="text-center">
              <p className="text-xl font-bold text-primary-foreground">{userScore}</p>
            </div>
          </div>
          
          <div className="text-primary-foreground/50 font-bold">VS</div>
          
          <div className="flex items-center gap-2">
            <div className="text-center">
              <p className="text-xl font-bold text-primary-foreground">{opponentScore}</p>
            </div>
            <Avatar emoji={opponent?.avatarEmoji || "🤖"} size="sm" />
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center mb-4">
          <ProgressDots
            total={questions.length}
            current={currentQuestionIndex}
            userProgress={userProgress}
            opponentProgress={opponentProgress}
          />
        </div>

        {/* Timer bar */}
        <div className="h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
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

      {/* Question Content - Card style */}
      <div className="bg-background/95 backdrop-blur-lg rounded-3xl p-6 flex-1 flex flex-col shadow-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col flex-1"
          >
            {/* Result Banner */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "mb-4 p-3 rounded-2xl flex items-center justify-center gap-3",
                  lastAnswerCorrect ? "bg-success/10" : "bg-destructive/10"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  lastAnswerCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                )}>
                  {lastAnswerCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "font-bold text-lg",
                  lastAnswerCorrect ? "text-success" : "text-destructive"
                )}>
                  {lastAnswerCorrect ? `+${lastPointsEarned} points!` : "Wrong answer!"}
                </span>
              </motion.div>
            )}

            {/* Question */}
            <div className="mb-6">
              <span className={cn(
                "inline-block px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide mb-3",
                currentQuestion.difficulty === "easy" && "bg-success/10 text-success",
                currentQuestion.difficulty === "medium" && "bg-primary/10 text-primary",
                currentQuestion.difficulty === "hard" && "bg-destructive/10 text-destructive"
              )}>
                {currentQuestion.difficulty}
              </span>
              <p className="text-xl font-bold text-foreground leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answers */}
            <div className="flex-1 flex flex-col gap-3">
              {currentQuestion.allAnswers.map((answer, index) => {
                const isSelected = selectedAnswer === answer || lastUserAnswer === answer;
                const isCorrect = answer === currentQuestion.correctAnswer;
                const isOpponentAnswer = showResult && lastOpponentAnswer === answer;
                const letters = ["A", "B", "C", "D"];

                // Determine styling based on state
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
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    onClick={() => handleAnswer(answer)}
                    disabled={!!selectedAnswer || showResult}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl text-left transition-all border-2 relative",
                      "disabled:cursor-not-allowed",
                      buttonStyle
                    )}
                  >
                    <span
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
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

                    {/* Opponent Avatar on their answer */}
                    {isOpponentAnswer && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="flex items-center gap-2"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-lg border-2",
                          lastOpponentCorrect 
                            ? "bg-success/20 border-success" 
                            : "bg-destructive/20 border-destructive"
                        )}>
                          {opponent?.avatarEmoji || "🤖"}
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center",
                          lastOpponentCorrect 
                            ? "bg-success text-success-foreground" 
                            : "bg-destructive text-destructive-foreground"
                        )}>
                          {lastOpponentCorrect ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6"
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
