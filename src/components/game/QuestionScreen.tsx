import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame, PowerUpType } from "@/contexts/GameContext";
import { useSound } from "@/contexts/SoundContext";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { Check, X, Crown, Zap } from "lucide-react";

type AnswerState = "idle" | "selected" | "revealed";

export function QuestionScreen() {
  const { playSound, vibrate, startBackgroundMusic, stopBackgroundMusic } = useSound();
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
    playerPowerUps,
    usePowerUp,
    hiddenAnswers,
    replacedAnswer,
    playerTimerBonus,
    opponentFrozen,
  } = useGame();

  // Start background music when game starts
  useEffect(() => {
    startBackgroundMusic();
    return () => stopBackgroundMusic();
  }, [startBackgroundMusic, stopBackgroundMusic]);

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");

  const currentQuestion = questions[currentQuestionIndex];

  // Sync state with phase changes
  useEffect(() => {
    if (phase === "playing") {
      setAnswerState("idle");
      setSelectedAnswer(null);
      setTimeRemaining(timePerQuestion + playerTimerBonus);
    } else if (phase === "question-result") {
      setAnswerState("revealed");
    }
  }, [phase, timePerQuestion, playerTimerBonus]);

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

  const handleUsePowerUp = useCallback((type: PowerUpType) => {
    if (answerState !== "idle") return;
    
    // Play power-up specific sound
    switch (type) {
      case "fifty-fifty":
        playSound("power-up-5050");
        break;
      case "freeze":
        playSound("power-up-freeze");
        break;
      case "replace":
        playSound("power-up-replace");
        break;
      case "time-drain":
        playSound("power-up-time-drain");
        break;
      default:
        playSound("power-up");
    }
    vibrate([30, 20, 30]);
    
    usePowerUp(type);
  }, [answerState, usePowerUp, playSound, vibrate]);

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

  // Filter visible answers based on power-ups
  const visibleAnswers = currentQuestion.allAnswers.filter(answer => {
    if (hiddenAnswers.includes(answer)) return false;
    if (replacedAnswer?.old === answer) return false;
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
      {/* Header with avatars and scores */}
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Player */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#5B4BC4] flex items-center justify-center border-2 border-white/30">
            <span className="text-xl">😊</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
            <Crown className="w-3 h-3 text-quiz-yellow fill-quiz-yellow" />
            <span className="text-white font-bold text-sm">{userScore}</span>
          </div>
        </div>

        {/* VS indicator */}
        <span className="text-white/60 text-sm font-medium">vs</span>

        {/* Opponent */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
            <Crown className="w-3 h-3 text-quiz-yellow fill-quiz-yellow" />
            <span className="text-white font-bold text-sm">{opponentScore}</span>
          </div>
          <div className="relative">
            <div className={cn(
              "w-10 h-10 rounded-full bg-[#5B4BC4] flex items-center justify-center border-2",
              opponentFrozen ? "border-blue-400" : "border-white/30"
            )}>
              <span className="text-xl">{opponent?.avatarEmoji || "🤖"}</span>
            </div>
            {opponentFrozen && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center"
              >
                <span className="text-xs">❄️</span>
              </motion.div>
            )}
          </div>
          <Zap className="w-4 h-4 text-quiz-yellow fill-quiz-yellow" />
        </div>
      </div>

      {/* Power-ups bar */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-center gap-3">
          {playerPowerUps.map((powerUp, index) => (
            <PowerUpBadge
              key={powerUp.type}
              type={powerUp.type}
              size="md"
              index={index}
              count={powerUp.available}
              disabled={powerUp.available <= 0 || answerState !== "idle"}
              used={powerUp.usedThisQuestion}
              onClick={() => handleUsePowerUp(powerUp.type)}
            />
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
        {/* Question card */}
        <div className="bg-[#5B4BC4] rounded-3xl p-5 mb-4 flex-shrink-0 relative">
          {/* Timer progress */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-4">
            <motion.div
              className={cn(
                "h-full rounded-full",
                isRevealed ? "bg-success" :
                timerPercentage > 50 ? "bg-white" : 
                timerPercentage > 25 ? "bg-quiz-yellow" : "bg-destructive"
              )}
              style={{ width: isRevealed ? "100%" : `${timerPercentage}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Result banner - absolute positioned to prevent layout shift */}
          <div className="h-12 mb-2">
            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "py-2 px-4 rounded-xl flex items-center justify-center gap-2",
                    lastAnswerCorrect ? "bg-success/20" : "bg-destructive/20"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    lastAnswerCorrect ? "bg-success" : "bg-destructive"
                  )}>
                    {lastAnswerCorrect ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-white font-bold">
                    {lastAnswerCorrect ? `+${lastPointsEarned} ქულა!` : "არასწორია!"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Question text */}
          <p className="text-white text-2xl font-bold italic text-center leading-snug">
            {currentQuestion.question}
          </p>
        </div>

        {/* Answer buttons - fixed height container */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {visibleAnswers.map((answer, visibleIndex) => {
            const originalIndex = currentQuestion.allAnswers.indexOf(answer);
            const isThisSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            const isOpponentAnswer = isRevealed && lastOpponentAnswer === answer;

            let buttonBg = "bg-white";
            let letterBg = "bg-[#7DD3FC]";
            let letterText = "text-white";
            let answerText = "text-[#2A2550]";
            let shadow = "shadow-[0_4px_0_0_#CBD5E1]";

            if (answerState !== "idle") {
              if (isRevealed) {
                if (isCorrect) {
                  buttonBg = "bg-success";
                  letterBg = "bg-white";
                  letterText = "text-success";
                  answerText = "text-white";
                  shadow = "shadow-[0_4px_0_0_#16A34A]";
                } else if (isThisSelected && !isCorrect) {
                  buttonBg = "bg-destructive";
                  letterBg = "bg-white";
                  letterText = "text-destructive";
                  answerText = "text-white";
                  shadow = "shadow-[0_4px_0_0_#DC2626]";
                }
              } else if (isThisSelected) {
                buttonBg = "bg-[#7DD3FC]";
                letterBg = "bg-white";
                letterText = "text-[#7DD3FC]";
                answerText = "text-white";
                shadow = "shadow-[0_4px_0_0_#38BDF8]";
              }
            }

            return (
              <motion.button
                key={`${currentQuestionIndex}-${originalIndex}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: visibleIndex * 0.05 }}
                onClick={() => handleAnswer(answer)}
                disabled={answerState !== "idle"}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl text-left relative",
                  "disabled:cursor-not-allowed h-16",
                  buttonBg,
                  shadow
                )}
              >
                <span className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0",
                  letterBg,
                  letterText
                )}>
                  {isRevealed && isCorrect ? (
                    <Check className="w-5 h-5" />
                  ) : isRevealed && isThisSelected && !isCorrect ? (
                    <X className="w-5 h-5" />
                  ) : (
                    `${letters[originalIndex]}:`
                  )}
                </span>
                <span className={cn("flex-1 font-bold text-lg", answerText)}>
                  {answer}
                </span>

                {isOpponentAnswer && (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-lg border-2",
                    lastOpponentCorrect 
                      ? "bg-success/20 border-success" 
                      : "bg-destructive/20 border-destructive"
                  )}>
                    {opponent?.avatarEmoji || "🤖"}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Next Button - always reserve space to prevent jumping */}
        <div className="mt-4 flex-shrink-0 h-14">
          <div className={cn(
            "transition-opacity duration-200",
            isRevealed ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <ChunkyButton
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
            >
              {currentQuestionIndex < questions.length - 1 ? "შემდეგი კითხვა" : "შედეგები"}
            </ChunkyButton>
          </div>
        </div>
      </div>
    </div>
  );
}
