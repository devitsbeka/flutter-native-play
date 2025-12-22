import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
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
    phase,
    lastAnswerCorrect,
    lastOpponentCorrect,
    lastOpponentAnswer,
    lastUserAnswer,
    lastPointsEarned,
  } = useGame();
  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [scoreKey, setScoreKey] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];
  const showResult = phase === "question-result";

  // Memoize category to prevent unnecessary recalculations
  const category = useMemo(() => 
    currentQuestion?.category.split(":").pop()?.trim() || currentQuestion?.category || "",
    [currentQuestion?.category]
  );

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer || showResult) return;
    setSelectedAnswer(answer);
    answerQuestion(answer, timeRemaining);
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

  // Trigger score animation
  useEffect(() => {
    if (showResult && lastAnswerCorrect) {
      setScoreKey(prev => prev + 1);
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

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col py-2">
      {/* Header - Minimal single line */}
      <div className="flex items-center justify-between px-1 mb-2 flex-shrink-0">
        <span className="bg-primary/20 px-2 py-0.5 rounded-full text-xs font-medium text-primary">
          {category}
        </span>
        
        {/* Score Display */}
        <div className="flex items-center gap-2">
          <motion.div 
            key={scoreKey}
            className="flex items-center gap-1"
            initial={scoreKey > 0 ? { scale: 1.3 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
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
          "px-2 py-0.5 rounded-full text-xs font-bold tabular-nums transition-colors duration-200",
          showResult ? "bg-success/20 text-success" : 
          timerPercentage > 25 ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
        )}>
          {showResult ? "✓" : `${Math.ceil(timeRemaining)}s`}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-3 flex-shrink-0">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-100",
            showResult ? "bg-success" :
            timerPercentage > 50 ? "bg-primary" : 
            timerPercentage > 25 ? "bg-quiz-yellow" : "bg-destructive"
          )}
          style={{ width: showResult ? "100%" : `${timerPercentage}%` }}
        />
      </div>

      {/* Question Content */}
      <div className="bg-background/95 backdrop-blur-lg rounded-2xl p-4 flex-1 flex flex-col shadow-xl overflow-hidden">
        {/* Result Banner - Fixed height to prevent layout shift */}
        <div className="h-10 mb-3 flex-shrink-0">
          <div className={cn(
            "h-full rounded-xl flex items-center justify-center gap-2 transition-opacity duration-200",
            showResult 
              ? lastAnswerCorrect ? "bg-success/10 opacity-100" : "bg-destructive/10 opacity-100"
              : "opacity-0 pointer-events-none"
          )}>
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
          </div>
        </div>

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

        {/* Answers */}
        <div className="flex-1 flex flex-col gap-2.5 min-h-0">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isSelected = selectedAnswer === answer || lastUserAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            const isOpponentAnswer = showResult && lastOpponentAnswer === answer;
            const letters = ["A", "B", "C", "D"];

            return (
              <button
                key={`${currentQuestionIndex}-${index}`}
                onClick={() => handleAnswer(answer)}
                disabled={!!selectedAnswer || showResult}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl text-left border-2 relative flex-shrink-0",
                  "disabled:cursor-not-allowed min-h-[56px]",
                  // Base styles
                  !showResult && !isSelected && "bg-card border-border hover:border-primary/50 active:scale-[0.98]",
                  // Selected but not showing result yet
                  !showResult && isSelected && "bg-primary border-primary text-primary-foreground",
                  // Showing result - correct answer
                  showResult && isCorrect && "bg-success/10 border-success",
                  // Showing result - wrong selected answer
                  showResult && isSelected && !isCorrect && "bg-destructive/10 border-destructive",
                  // Showing result - opponent's wrong answer
                  showResult && isOpponentAnswer && !isCorrect && !isSelected && "bg-destructive/5 border-destructive/50",
                  // Showing result - other answers
                  showResult && !isCorrect && !isSelected && !isOpponentAnswer && "bg-card border-border opacity-60"
                )}
              >
                <span
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0",
                    !showResult && !isSelected && "bg-secondary text-foreground",
                    !showResult && isSelected && "bg-primary-foreground/20 text-primary-foreground",
                    showResult && isCorrect && "bg-success text-success-foreground",
                    showResult && isSelected && !isCorrect && "bg-destructive text-destructive-foreground",
                    showResult && !isCorrect && !isSelected && "bg-secondary text-foreground"
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
                  !showResult && isSelected && "text-primary-foreground",
                  showResult && isCorrect && "text-success",
                  showResult && isSelected && !isCorrect && "text-destructive"
                )}>
                  {answer}
                </span>

                {isOpponentAnswer && (
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-sm border",
                    lastOpponentCorrect 
                      ? "bg-success/20 border-success" 
                      : "bg-destructive/20 border-destructive"
                  )}>
                    {opponent?.avatarEmoji || "🤖"}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Next Button - Fixed height to prevent layout shift */}
        <div className="h-14 mt-3 flex-shrink-0">
          <div className={cn(
            "h-full transition-opacity duration-200",
            showResult ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <ChunkyButton
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full h-full"
            >
              {currentQuestionIndex < questions.length - 1 ? "Next Question" : "See Results"}
            </ChunkyButton>
          </div>
        </div>
      </div>
    </div>
  );
}
