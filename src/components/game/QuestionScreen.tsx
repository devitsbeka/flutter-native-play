import { useState, useEffect, useCallback, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Check, X } from "lucide-react";

type AnswerState = "idle" | "selected" | "revealed";

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
    lastPointsEarned,
  } = useGame();

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");

  const currentQuestion = questions[currentQuestionIndex];

  const category = useMemo(() => 
    currentQuestion?.category.split(":").pop()?.trim() || currentQuestion?.category || "",
    [currentQuestion?.category]
  );

  // Sync state with phase changes
  useEffect(() => {
    if (phase === "playing") {
      setAnswerState("idle");
      setSelectedAnswer(null);
      setTimeRemaining(timePerQuestion);
    } else if (phase === "question-result") {
      setAnswerState("revealed");
    }
  }, [phase, timePerQuestion]);

  // Reset on question change
  useEffect(() => {
    setAnswerState("idle");
    setSelectedAnswer(null);
    setTimeRemaining(timePerQuestion);
  }, [currentQuestionIndex, timePerQuestion]);

  const handleAnswer = useCallback((answer: string) => {
    if (answerState !== "idle") return;
    setSelectedAnswer(answer);
    setAnswerState("selected");
    answerQuestion(answer, timeRemaining);
  }, [answerState, answerQuestion, timeRemaining]);

  const handleNext = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  // Timer
  useEffect(() => {
    if (answerState !== "idle") return;

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
  }, [answerState, handleAnswer]);

  if (!currentQuestion) return null;

  const timerPercentage = (timeRemaining / timePerQuestion) * 100;
  const isRevealed = answerState === "revealed";
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2 flex-shrink-0">
        <span className="bg-primary/20 px-2 py-0.5 rounded-full text-xs font-medium text-primary">
          {category}
        </span>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-base">😊</span>
            <span className="text-sm font-bold text-foreground">{userScore}</span>
          </div>
          <span className="text-muted-foreground text-xs">-</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-foreground">{opponentScore}</span>
            <span className="text-base">{opponent?.avatarEmoji || "🤖"}</span>
          </div>
        </div>

        <div className={cn(
          "px-2 py-0.5 rounded-full text-xs font-bold tabular-nums",
          isRevealed ? "bg-success/20 text-success" : 
          timerPercentage > 25 ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
        )}>
          {isRevealed ? "✓" : `${Math.ceil(timeRemaining)}s`}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-3 flex-shrink-0">
        <div
          className={cn(
            "h-full rounded-full",
            isRevealed ? "bg-success w-full" :
            timerPercentage > 50 ? "bg-primary" : 
            timerPercentage > 25 ? "bg-quiz-yellow" : "bg-destructive"
          )}
          style={{ width: isRevealed ? "100%" : `${timerPercentage}%` }}
        />
      </div>

      {/* Question Content */}
      <div className="bg-background/95 backdrop-blur-lg rounded-2xl p-4 flex-1 flex flex-col shadow-xl overflow-hidden">
        {/* Result Banner - Fixed height */}
        <div className="h-10 mb-3 flex-shrink-0">
          {isRevealed && (
            <div className={cn(
              "h-full rounded-xl flex items-center justify-center gap-2",
              lastAnswerCorrect ? "bg-success/10" : "bg-destructive/10"
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
          )}
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

        {/* Answers - No animations, stable layout */}
        <div className="flex-1 flex flex-col gap-2.5 min-h-0">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isThisSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            const isOpponentAnswer = isRevealed && lastOpponentAnswer === answer;

            // Compute styles based on local state only
            let buttonStyles = "bg-card border-border";
            let letterStyles = "bg-secondary text-foreground";
            let textStyles = "";

            if (answerState === "idle") {
              // Default idle state
              buttonStyles = "bg-card border-border hover:border-primary/50 active:scale-[0.98]";
            } else if (answerState === "selected" && !isRevealed) {
              // User selected but waiting for result
              if (isThisSelected) {
                buttonStyles = "bg-primary border-primary";
                letterStyles = "bg-primary-foreground/20 text-primary-foreground";
                textStyles = "text-primary-foreground";
              }
            } else if (isRevealed) {
              // Showing results
              if (isCorrect) {
                buttonStyles = "bg-success/10 border-success";
                letterStyles = "bg-success text-success-foreground";
                textStyles = "text-success";
              } else if (isThisSelected && !isCorrect) {
                buttonStyles = "bg-destructive/10 border-destructive";
                letterStyles = "bg-destructive text-destructive-foreground";
                textStyles = "text-destructive";
              } else if (isOpponentAnswer && !isCorrect) {
                buttonStyles = "bg-destructive/5 border-destructive/50 opacity-60";
              } else {
                buttonStyles = "bg-card border-border opacity-60";
              }
            }

            return (
              <button
                key={`${currentQuestionIndex}-${index}`}
                onClick={() => handleAnswer(answer)}
                disabled={answerState !== "idle"}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl text-left border-2 relative flex-shrink-0",
                  "disabled:cursor-not-allowed min-h-[56px]",
                  buttonStyles
                )}
              >
                <span className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0",
                  letterStyles
                )}>
                  {isRevealed && isCorrect ? (
                    <Check className="w-5 h-5" />
                  ) : isRevealed && isThisSelected && !isCorrect ? (
                    <X className="w-5 h-5" />
                  ) : (
                    letters[index]
                  )}
                </span>
                <span className={cn("flex-1 font-semibold", textStyles)}>
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

        {/* Next Button - Fixed height */}
        <div className="h-14 mt-3 flex-shrink-0">
          {isRevealed && (
            <ChunkyButton
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full h-full"
            >
              {currentQuestionIndex < questions.length - 1 ? "Next Question" : "See Results"}
            </ChunkyButton>
          )}
        </div>
      </div>
    </div>
  );
}
