import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame, PowerUpType } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { AvatarCircle } from "@/components/home/AvatarCircle";
import { Check, X, Crown } from "lucide-react";

type AnswerState = "idle" | "selected" | "revealed";

export function QuestionScreen() {
  const { user, profile } = useAuth();
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
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#4ECDC4] to-[#44B8AD]">
      {/* Header with VS avatars and scores */}
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Player */}
        <div className="flex flex-col items-center gap-1">
          <AvatarCircle
            avatarUrl={profile?.avatar_url || undefined}
            size={56}
          />
          <span className="text-white text-xs font-medium truncate max-w-[70px]">
            {profile?.nickname || user?.email?.split("@")[0] || "შენ"}
          </span>
        </div>

        {/* VS + Scores */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full">
              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-white font-bold text-sm">{userScore}</span>
            </div>
            <span className="text-white/80 text-xs font-bold">VS</span>
            <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full">
              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-white font-bold text-sm">{opponentScore}</span>
            </div>
          </div>
          {/* Timer display */}
          <div 
            className="px-3 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: "rgba(0,0,0,0.2)",
              color: timerPercentage > 50 ? "white" : timerPercentage > 25 ? "#fbbf24" : "#ef4444"
            }}
          >
            {Math.ceil(timeRemaining)}წმ
          </div>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            <AvatarCircle
              avatarUrl={opponent?.avatarUrl}
              size={56}
            />
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
          <span className="text-white text-xs font-medium truncate max-w-[70px]">
            {opponent?.name || "AI ოპონენტი"}
          </span>
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
        <div className="bg-white rounded-3xl p-5 mb-3 flex-shrink-0 relative shadow-lg">
          {/* Question number badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#4ECDC4] border-4 border-white flex items-center justify-center">
            <span className="text-white text-sm font-bold">{currentQuestionIndex + 1}</span>
          </div>

          {/* Category badge */}
          {currentQuestion.category && (
            <div className="text-center mb-2 mt-2">
              <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
                {currentQuestion.category}
              </span>
            </div>
          )}

          {/* Question text */}
          <p className="text-[#2A5A5A] text-xl font-bold text-center leading-snug mt-2">
            {currentQuestion.question}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                idx === currentQuestionIndex 
                  ? "bg-white scale-125" 
                  : idx < currentQuestionIndex 
                    ? "bg-white/80" 
                    : "bg-white/30"
              )}
            />
          ))}
        </div>

        {/* Answer buttons */}
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
            let borderColor = "border-[#7DD3FC]";
            let shadow = "shadow-[0_4px_0_0_#CBD5E1]";

            if (answerState !== "idle") {
              if (isRevealed) {
                if (isCorrect) {
                  buttonBg = "bg-emerald-500";
                  letterBg = "bg-white";
                  letterText = "text-emerald-500";
                  answerText = "text-white";
                  borderColor = "border-emerald-400";
                  shadow = "shadow-[0_4px_0_0_#059669]";
                } else if (isThisSelected && !isCorrect) {
                  buttonBg = "bg-rose-500";
                  letterBg = "bg-white";
                  letterText = "text-rose-500";
                  answerText = "text-white";
                  borderColor = "border-rose-400";
                  shadow = "shadow-[0_4px_0_0_#DC2626]";
                }
              } else if (isThisSelected) {
                buttonBg = "bg-[#7DD3FC]";
                letterBg = "bg-white";
                letterText = "text-[#7DD3FC]";
                answerText = "text-white";
                borderColor = "border-sky-400";
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
                  "flex items-center gap-4 p-4 rounded-2xl text-left relative border-2",
                  "disabled:cursor-not-allowed h-16",
                  buttonBg,
                  borderColor,
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

                {/* Show opponent avatar if they chose this answer */}
                {isOpponentAnswer && (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 overflow-hidden",
                    lastOpponentCorrect 
                      ? "border-emerald-500" 
                      : "border-rose-500"
                  )}>
                    {opponent?.avatarUrl ? (
                      <img src={opponent.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{opponent?.avatarEmoji || "🤖"}</span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Result banner - show above button when revealed */}
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "py-2 px-4 rounded-xl flex items-center justify-center gap-2 mb-3",
                lastAnswerCorrect ? "bg-emerald-500/20" : "bg-rose-500/20"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                lastAnswerCorrect ? "bg-emerald-500" : "bg-rose-500"
              )}>
                {lastAnswerCorrect ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
              </div>
              <span className="text-white font-bold">
                {lastAnswerCorrect ? `+${lastPointsEarned} ქულა!` : "არასწორია!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Button */}
        <div className="flex-shrink-0 h-14">
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
