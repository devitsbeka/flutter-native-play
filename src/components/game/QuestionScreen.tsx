import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import { BoardGameMap } from "./BoardGameMap";
import { ImageIcon } from "lucide-react";

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
    userAnswerHistory,
    opponentAnswerHistory,
  } = useGame();
  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    
    // Small delay for visual feedback before transitioning
    setTimeout(() => {
      answerQuestion(answer, timeRemaining);
    }, 300);
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
  const timerColor = timerPercentage > 50 
    ? "bg-primary" 
    : timerPercentage > 25 
      ? "bg-yellow-500" 
      : "bg-destructive";

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-b from-background via-background to-primary/10">
      {/* Board Game Map - Compact */}
      <div className="mb-4">
        <BoardGameMap
          totalTiles={questions.length}
          userProgress={userProgress}
          opponentProgress={opponentProgress}
          userAnswerHistory={userAnswerHistory}
          opponentAnswerHistory={opponentAnswerHistory}
          compact
        />
      </div>

      {/* Header with scores */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{userScore}</p>
          <p className="text-xs text-muted-foreground">You</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card/50 rounded-full px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {currentQuestionIndex + 1}/{questions.length}
          </span>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-destructive">{opponentScore}</p>
          <p className="text-xs text-muted-foreground">{opponent?.name}</p>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full h-3 bg-muted rounded-full mb-4 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full transition-colors", timerColor)}
          initial={{ width: "100%" }}
          animate={{ width: `${timerPercentage}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Category Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center mb-3"
      >
        <span className="bg-primary/20 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
          {currentQuestion.category}
        </span>
      </motion.div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex-1 flex flex-col"
        >
          {/* Question Image */}
          <div className="relative w-full aspect-video rounded-2xl mb-4 overflow-hidden bg-muted">
            {currentQuestion.imageUrl ? (
              <>
                <motion.img
                  src={currentQuestion.imageUrl}
                  alt="Question illustration"
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Loading image...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <ImageIcon className="w-8 h-8 text-primary/50" />
                  </motion.div>
                  <span className="text-xs text-muted-foreground">Generating image...</span>
                </div>
              </div>
            )}
          </div>

          {/* Question Text */}
          <div className="bg-card rounded-2xl p-4 mb-4 shadow-lg border border-border">
            <p className="text-lg font-semibold text-foreground text-center leading-relaxed">
              {currentQuestion.question}
            </p>
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-1 gap-2">
            {currentQuestion.allAnswers.map((answer, index) => {
              const isSelected = selectedAnswer === answer;
              const letters = ["A", "B", "C", "D"];

              return (
                <motion.button
                  key={answer}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAnswer(answer)}
                  disabled={!!selectedAnswer}
                  className={cn(
                    "relative flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                    "border-2 shadow-md hover:shadow-lg",
                    "disabled:cursor-not-allowed",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground scale-[0.98]"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-card/80"
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {letters[index]}
                  </span>
                  <span className="flex-1 font-medium text-sm">{answer}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Difficulty indicator */}
      <div className="mt-3 flex justify-center">
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          currentQuestion.difficulty === "easy" && "bg-emerald-500/20 text-emerald-600",
          currentQuestion.difficulty === "medium" && "bg-yellow-500/20 text-yellow-600",
          currentQuestion.difficulty === "hard" && "bg-destructive/20 text-destructive"
        )}>
          {currentQuestion.difficulty.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
