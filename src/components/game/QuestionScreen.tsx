import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import { ProgressDots } from "./ProgressDots";
import { Avatar } from "@/components/shared/Avatar";

export function QuestionScreen() {
  const { 
    questions, 
    currentQuestionIndex, 
    answerQuestion, 
    timePerQuestion, 
    userScore, 
    opponentScore, 
    opponent,
    userProgress,
    opponentProgress,
  } = useGame();
  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    
    setTimeout(() => {
      answerQuestion(answer, timeRemaining);
    }, 200);
  }, [selectedAnswer, answerQuestion, timeRemaining]);

  useEffect(() => {
    setTimeRemaining(timePerQuestion);
    setSelectedAnswer(null);
    setImageLoaded(false);
  }, [currentQuestionIndex, timePerQuestion]);

  useEffect(() => {
    if (selectedAnswer) return;

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
  }, [selectedAnswer, handleAnswer]);

  if (!currentQuestion) return null;

  const timerPercentage = (timeRemaining / timePerQuestion) * 100;
  const category = currentQuestion.category.split(":").pop()?.trim() || currentQuestion.category;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Purple Header with Image */}
      <div className="relative gradient-purple pt-6 pb-32">
        {/* Top bar - Timer & Category */}
        <div className="flex items-center justify-between px-6 mb-4">
          <span className="bg-primary-foreground/20 px-4 py-1.5 rounded-full text-sm font-medium text-primary-foreground">
            {category}
          </span>
          <div className="bg-primary-foreground/20 px-4 py-1.5 rounded-full">
            <span className={cn(
              "text-sm font-bold tabular-nums",
              timerPercentage > 25 ? "text-primary-foreground" : "text-quiz-coral"
            )}>
              {Math.ceil(timeRemaining)}s
            </span>
          </div>
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center gap-6 mb-6">
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
        <div className="flex justify-center">
          <ProgressDots
            total={questions.length}
            current={currentQuestionIndex}
            userProgress={userProgress}
            opponentProgress={opponentProgress}
          />
        </div>

        {/* Timer bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-foreground/20">
          <motion.div
            className={cn(
              "h-full",
              timerPercentage > 50 ? "bg-primary-foreground" : 
              timerPercentage > 25 ? "bg-quiz-yellow" : "bg-quiz-coral"
            )}
            animate={{ width: `${timerPercentage}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* White Content Area */}
      <div className="flex-1 bg-background rounded-t-[2rem] -mt-6 relative z-10 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col h-full"
          >
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
                const isSelected = selectedAnswer === answer;
                const letters = ["A", "B", "C", "D"];

                return (
                  <motion.button
                    key={answer}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    onClick={() => handleAnswer(answer)}
                    disabled={!!selectedAnswer}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl text-left transition-all border-2",
                      "disabled:cursor-not-allowed",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-card border-border hover:border-primary/50"
                    )}
                  >
                    <span
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-secondary text-foreground"
                      )}
                    >
                      {letters[index]}
                    </span>
                    <span className="flex-1 font-semibold">{answer}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
