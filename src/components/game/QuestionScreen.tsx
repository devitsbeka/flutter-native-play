import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame, PowerUpType } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { AvatarCircle } from "@/components/home/AvatarCircle";
import { Check, X, Crown, ChevronLeft, Sun, Moon, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

type AnswerState = "idle" | "selected" | "revealed";

export function QuestionScreen() {
  const { user, profile } = useAuth();
  const { playSound, vibrate, startBackgroundMusic, stopBackgroundMusic } = useSound();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Start background music when game starts
  useEffect(() => {
    startBackgroundMusic();
    return () => stopBackgroundMusic();
  }, [startBackgroundMusic, stopBackgroundMusic]);

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [questionResults, setQuestionResults] = useState<(boolean | null)[]>([]);
  const [timedOut, setTimedOut] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize question results array
  useEffect(() => {
    if (questions.length > 0 && questionResults.length === 0) {
      setQuestionResults(new Array(questions.length).fill(null));
    }
  }, [questions.length, questionResults.length]);

  // Sync state with phase changes
  useEffect(() => {
    if (phase === "playing") {
      setAnswerState("idle");
      setSelectedAnswer(null);
      setTimeRemaining(timePerQuestion + playerTimerBonus);
      setTimedOut(false);
    } else if (phase === "question-result") {
      setAnswerState("revealed");
      // Record result for current question
      setQuestionResults(prev => {
        const updated = [...prev];
        updated[currentQuestionIndex] = lastAnswerCorrect ?? false;
        return updated;
      });
    }
  }, [phase, timePerQuestion, playerTimerBonus, currentQuestionIndex, lastAnswerCorrect]);

  // Reset on question change
  useEffect(() => {
    setAnswerState("idle");
    setSelectedAnswer(null);
    setTimeRemaining(timePerQuestion);
    setTimedOut(false);
  }, [currentQuestionIndex, timePerQuestion]);

  const handleAnswer = useCallback((answer: string, isTimeout = false) => {
    if (answerState !== "idle") return;
    if (isTimeout) {
      setTimedOut(true);
    }
    setSelectedAnswer(answer || null);
    setAnswerState("selected");
    answerQuestion(answer, isTimeout ? 0 : timeRemaining);
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

  // Timer - use ref to avoid stale closure issues
  useEffect(() => {
    if (answerState !== "idle") return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          // Schedule timeout handling outside of state update
          setTimeout(() => handleAnswer("", true), 0);
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
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#9B8AC4] to-[#8B7AB8] dark:from-slate-900 dark:to-slate-800">
      {/* Safe area spacer */}
      <div className="pt-[env(safe-area-inset-top,8px)]" />

      {/* Header row - avatars with scores inline */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Player - avatar + score */}
        <div className="flex items-center gap-2">
          <AvatarCircle
            avatarUrl={profile?.avatar_url || undefined}
            size={44}
          />
          <div className="flex items-center gap-1 bg-white/20 dark:bg-white/10 px-2.5 py-1 rounded-full">
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-white font-bold text-sm">{userScore}</span>
          </div>
        </div>

        {/* VS center */}
        <span className="text-white/70 text-sm font-medium">vs</span>

        {/* Opponent - score + avatar + lightning */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/20 dark:bg-white/10 px-2.5 py-1 rounded-full">
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-white font-bold text-sm">{opponentScore}</span>
          </div>
          <div className="relative">
            <AvatarCircle
              avatarUrl={opponent?.avatarUrl}
              size={44}
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
          <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
        </div>
      </div>

      {/* Power-ups bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          {playerPowerUps.map((powerUp, index) => (
            <PowerUpBadge
              key={powerUp.type}
              type={powerUp.type}
              size="lg"
              index={index}
              count={powerUp.available}
              disabled={powerUp.available <= 0 || answerState !== "idle"}
              used={powerUp.usedThisQuestion}
              onClick={() => handleUsePowerUp(powerUp.type)}
            />
          ))}
        </div>
      </div>

      {/* Question card - purple themed */}
      <div className="mx-4 mb-4 bg-[#7B6BA8] dark:bg-slate-800 rounded-3xl p-5 relative shadow-lg">
        {/* Timer progress bar */}
        <div className="mb-4 h-2 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: timerPercentage > 50 ? "white" : timerPercentage > 25 ? "#fbbf24" : "#ef4444",
              width: `${timerPercentage}%`,
            }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Opponent indicator with cursor */}
        <div className="flex justify-center mb-3">
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-emerald-400 -mb-1">
              <path fill="currentColor" d="M4 4l16 8-8 4-2 8-6-20z"/>
            </svg>
            <div className="absolute left-6 top-2 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded">
              {opponent?.name || "Bot"}
            </div>
          </div>
        </div>

        {/* Question text */}
        <p className="text-white text-xl font-bold text-center leading-relaxed">
          {currentQuestion.question}
        </p>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
        {/* Answer buttons */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {visibleAnswers.map((answer, visibleIndex) => {
            const originalIndex = currentQuestion.allAnswers.indexOf(answer);
            const isThisSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            const isOpponentAnswer = isRevealed && lastOpponentAnswer === answer;

            // Light theme: white cards with light blue letters, Dark theme: slate cards
            const isDark = theme === "dark";
            let buttonBg = isDark ? "bg-slate-700" : "bg-white";
            let letterBg = isDark ? "bg-sky-500" : "bg-[#7DD3FC]";
            let letterText = "text-white";
            let answerText = isDark ? "text-white" : "text-slate-700";
            let borderStyle = "border-transparent";
            let shadow = isDark ? "shadow-md" : "shadow-[0_2px_8px_rgba(0,0,0,0.08)]";

            if (answerState !== "idle") {
              if (isRevealed) {
                if (isCorrect) {
                  buttonBg = "bg-emerald-500";
                  letterBg = "bg-white";
                  letterText = "text-emerald-500";
                  answerText = "text-white";
                  borderStyle = "border-emerald-400";
                  shadow = "shadow-[0_4px_0_0_#059669]";
                } else if (isThisSelected && !isCorrect) {
                  buttonBg = "bg-rose-500";
                  letterBg = "bg-white";
                  letterText = "text-rose-500";
                  answerText = "text-white";
                  borderStyle = "border-rose-400";
                  shadow = "shadow-[0_4px_0_0_#DC2626]";
                }
              } else if (isThisSelected) {
                buttonBg = "bg-[#7DD3FC]";
                letterBg = "bg-white";
                letterText = "text-[#7DD3FC]";
                answerText = "text-white";
                borderStyle = "border-sky-400";
                shadow = "shadow-[0_4px_0_0_#38BDF8]";
              }
            }

            return (
              <motion.button
                key={`${currentQuestionIndex}-${originalIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: visibleIndex * 0.05 }}
                onClick={() => handleAnswer(answer, false)}
                disabled={answerState !== "idle"}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl text-left relative border",
                  "disabled:cursor-not-allowed min-h-[64px]",
                  buttonBg,
                  borderStyle,
                  shadow
                )}
              >
                <span className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0",
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
                <span className={cn("flex-1 font-semibold text-base", answerText)}>
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
                lastAnswerCorrect ? "bg-emerald-500/20" : timedOut ? "bg-amber-500/20" : "bg-rose-500/20"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                lastAnswerCorrect ? "bg-emerald-500" : timedOut ? "bg-amber-500" : "bg-rose-500"
              )}>
                {lastAnswerCorrect ? (
                  <Check className="w-4 h-4 text-white" />
                ) : timedOut ? (
                  <span className="text-white text-xs">⏱</span>
                ) : (
                  <X className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-white font-bold">
                {lastAnswerCorrect 
                  ? `+${lastPointsEarned} ქულა!` 
                  : timedOut 
                    ? "დრო ამოიწურა!" 
                    : "არასწორია!"}
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
