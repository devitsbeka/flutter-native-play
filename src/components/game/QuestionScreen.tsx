import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import { ProgressDots } from "./ProgressDots";

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Image Header */}
      <div className="relative w-full aspect-[16/9] max-h-[35vh] overflow-hidden bg-muted">
        {currentQuestion.imageUrl && (
          <motion.img
            src={currentQuestion.imageUrl}
            alt=""
            className={cn(
              "w-full h-full object-cover transition-opacity duration-500",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Category pill */}
        <div className="absolute bottom-4 left-4">
          <span className="glass-strong px-4 py-1.5 rounded-full text-sm font-medium text-foreground">
            {currentQuestion.category.split(":").pop()?.trim()}
          </span>
        </div>

        {/* Timer */}
        <div className="absolute bottom-4 right-4">
          <div className="glass-strong px-4 py-1.5 rounded-full">
            <span className={cn(
              "text-sm font-bold tabular-nums",
              timerPercentage > 50 ? "text-foreground" : 
              timerPercentage > 25 ? "text-primary" : "text-destructive"
            )}>
              {Math.ceil(timeRemaining)}s
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-5">
        {/* Progress & Scores */}
        <div className="flex items-center justify-between mb-5">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{userScore}</p>
            <p className="text-xs text-muted-foreground">You</p>
          </div>
          
          <ProgressDots
            total={questions.length}
            current={currentQuestionIndex}
            userProgress={userProgress}
            opponentProgress={opponentProgress}
          />
          
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{opponentScore}</p>
            <p className="text-xs text-muted-foreground">{opponent?.name}</p>
          </div>
        </div>

        {/* Timer bar */}
        <div className="w-full h-1 bg-secondary rounded-full mb-5 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              timerPercentage > 50 ? "bg-primary" : 
              timerPercentage > 25 ? "bg-primary" : "bg-destructive"
            )}
            animate={{ width: `${timerPercentage}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-foreground text-center mb-6 leading-relaxed">
              {currentQuestion.question}
            </p>

            {/* Answers */}
            <div className="flex-1 flex flex-col gap-3">
              {currentQuestion.allAnswers.map((answer, index) => {
                const isSelected = selectedAnswer === answer;
                const letters = ["A", "B", "C", "D"];

                return (
                  <motion.button
                    key={answer}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAnswer(answer)}
                    disabled={!!selectedAnswer}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl text-left transition-all",
                      "disabled:cursor-not-allowed",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-sm",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-foreground"
                      )}
                    >
                      {letters[index]}
                    </span>
                    <span className="flex-1 font-medium">{answer}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Difficulty */}
            <div className="flex justify-center mt-4">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide",
                currentQuestion.difficulty === "easy" && "bg-success/10 text-success",
                currentQuestion.difficulty === "medium" && "bg-primary/10 text-primary",
                currentQuestion.difficulty === "hard" && "bg-destructive/10 text-destructive"
              )}>
                {currentQuestion.difficulty}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
