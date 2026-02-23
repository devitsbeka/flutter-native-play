import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame, PowerUpType } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { AvatarCircle } from "@/components/home/AvatarCircle";
import { Check, X, Crown, ChevronLeft, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

type AnswerState = "idle" | "selected" | "revealed";

export function QuestionScreen() {
  const { user, profile } = useAuth();
  const { playSound, vibrate, startBackgroundMusic, stopBackgroundMusic } = useSound();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    playerTimerFrozen,
    playerFreezeEndTime,
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
  const [freezeTimeLeft, setFreezeTimeLeft] = useState(0);

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

  // Auto-advance on timeout after showing result
  useEffect(() => {
    if (phase === "question-result" && timedOut) {
      const timer = setTimeout(() => {
        nextQuestion();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, timedOut, nextQuestion]);

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

    // Check inventory (VS mode uses context power-ups, not DB)
    const powerUp = playerPowerUps.find(p => p.type === type);
    if (!powerUp || powerUp.available <= 0) return;

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
  }, [answerState, playerPowerUps, usePowerUp, playSound, vibrate]);

  // Timer - pauses when frozen
  useEffect(() => {
    if (answerState !== "idle") return;

    const timer = setInterval(() => {
      // Check if timer is frozen and freeze hasn't expired
      if (playerTimerFrozen && playerFreezeEndTime) {
        const remaining = Math.max(0, Math.ceil((playerFreezeEndTime - Date.now()) / 1000));
        if (remaining > 0) {
          setFreezeTimeLeft(remaining);
          return; // Don't decrement timer while frozen
        }
        // Freeze expired - fall through to resume normal timer
        setFreezeTimeLeft(0);
      }

      setFreezeTimeLeft(0);
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
  }, [answerState, handleAnswer, playerTimerFrozen, playerFreezeEndTime]);

  if (!currentQuestion) return null;

  const timerPercentage = (timeRemaining / timePerQuestion) * 100;
  const isRevealed = answerState === "revealed";
  const letters = ["ა", "ბ", "გ", "დ"];

  // Filter visible answers based on power-ups
  const visibleAnswers = currentQuestion.allAnswers.filter(answer => {
    if (hiddenAnswers.includes(answer)) return false;
    if (replacedAnswer?.old === answer) return false;
    return true;
  });

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-gradient-to-b from-[#9B8AC4] to-[#8B7AB8] dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Safe area + top bar with back and theme toggle */}
      <div className="pt-[env(safe-area-inset-top,8px)] mt-1 mb-1 px-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-white" />
          ) : (
            <Moon className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Header row - avatars with scores inline */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Player - avatar + score */}
        <div className="flex items-center gap-2">
          <AvatarCircle
            avatarUrl={profile?.avatar_url || undefined}
            size={40}
          />
          <div className="flex items-center gap-1 bg-white/20 dark:bg-white/10 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-white font-bold text-xs">{userScore}</span>
          </div>
        </div>

        {/* VS center */}
        <span className="text-white/70 text-sm font-medium">vs</span>

        {/* Opponent - score + avatar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/20 dark:bg-white/10 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-white font-bold text-xs">{opponentScore}</span>
          </div>
          <div className="relative">
            <AvatarCircle
              avatarUrl={opponent?.avatarUrl}
              size={40}
            />
            {opponentFrozen && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center"
              >
                <span className="text-[10px]">❄️</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Power-ups bar - 32px size */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-center gap-2">
          {playerPowerUps.map((powerUp, index) => (
            <PowerUpBadge
              key={powerUp.type}
              type={powerUp.type}
              size="sm"
              index={index}
              count={powerUp.available}
              disabled={powerUp.available <= 0 || answerState !== "idle"}
              used={powerUp.usedThisQuestion}
              onClick={() => handleUsePowerUp(powerUp.type)}
            />
          ))}
        </div>
      </div>

      {/* Question card - purple themed with freeze effect */}
      <div className={cn(
        "mx-4 mb-4 rounded-3xl p-5 relative shadow-lg transition-all duration-300",
        playerTimerFrozen && freezeTimeLeft > 0 
          ? "bg-cyan-100 dark:bg-cyan-900/50 ring-4 ring-cyan-400/50" 
          : "bg-[#7B6BA8] dark:bg-slate-800"
      )}>
        {/* Timer progress bar */}
        <div className="mb-4 h-2 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: playerTimerFrozen && freezeTimeLeft > 0 
                ? "linear-gradient(90deg, #00BCD4 0%, #4DD0E1 100%)"
                : timerPercentage > 50 ? "white" : timerPercentage > 25 ? "#fbbf24" : "#ef4444",
              width: `${timerPercentage}%`,
            }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Freeze indicator */}
        {playerTimerFrozen && freezeTimeLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-3 right-3 bg-cyan-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"
          >
            ❄️ {freezeTimeLeft}წ
          </motion.div>
        )}

        {/* Question text */}
        <p className={cn(
          "text-xl font-bold text-center leading-relaxed",
          playerTimerFrozen && freezeTimeLeft > 0 ? "text-cyan-800 dark:text-cyan-100" : "text-white"
        )}>
          {currentQuestion.question}
        </p>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] overflow-hidden min-h-0">
        {/* Answer buttons - 3D chunky style */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
          {visibleAnswers.map((answer, visibleIndex) => {
            const originalIndex = currentQuestion.allAnswers.indexOf(answer);
            const isThisSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            const isOpponentAnswer = isRevealed && lastOpponentAnswer === answer;

            // 3D chunky button styles
            const isDark = theme === "dark";
            let buttonBg = isDark ? "bg-slate-700" : "bg-white";
            let letterBg = isDark ? "bg-sky-500" : "bg-[#7DD3FC]";
            let letterText = "text-white";
            let answerText = isDark ? "text-white" : "text-slate-700";
            let shadow = isDark 
              ? "shadow-[0_4px_0_0_#334155]" 
              : "shadow-[0_4px_0_0_#d1d5db]";
            let hoverTransform = "hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#d1d5db]";
            let activeTransform = "active:translate-y-[4px] active:shadow-none";

            if (answerState !== "idle") {
              if (isRevealed) {
                if (isCorrect) {
                  buttonBg = "bg-emerald-500";
                  letterBg = "bg-white";
                  letterText = "text-emerald-500";
                  answerText = "text-white";
                  shadow = "shadow-[0_4px_0_0_#059669]";
                  hoverTransform = "";
                  activeTransform = "";
                } else if (isThisSelected && !isCorrect) {
                  buttonBg = "bg-rose-500";
                  letterBg = "bg-white";
                  letterText = "text-rose-500";
                  answerText = "text-white";
                  shadow = "shadow-[0_4px_0_0_#be123c]";
                  hoverTransform = "";
                  activeTransform = "";
                }
              } else if (isThisSelected) {
                buttonBg = "bg-[#7DD3FC]";
                letterBg = "bg-white";
                letterText = "text-[#7DD3FC]";
                answerText = "text-white";
                shadow = "shadow-[0_4px_0_0_#0ea5e9]";
                hoverTransform = "";
                activeTransform = "";
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
                  "flex items-center gap-4 p-3 rounded-2xl text-left relative",
                  "disabled:cursor-not-allowed min-h-[60px] transition-all duration-100",
                  buttonBg,
                  shadow,
                  hoverTransform,
                  activeTransform
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
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 overflow-hidden",
                    lastOpponentCorrect 
                      ? "border-emerald-500" 
                      : "border-rose-500"
                  )}>
                    {opponent?.avatarUrl ? (
                      <img src={resolveAvatarUrl(opponent.avatarUrl) || opponent.avatarUrl} alt="" className="w-full h-full object-cover" />
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
                  ? t("extra.plusPoints", { count: lastPointsEarned }) 
                  : timedOut 
                    ? t("extra.timeUpLabel") 
                    : t("extra.incorrectLabel")}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Button - always visible at bottom */}
        <div className="flex-shrink-0 pt-2">
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
              {currentQuestionIndex < questions.length - 1 ? t("game.nextQuestion") : t("extra.resultsLabel")}
            </ChunkyButton>
          </div>
        </div>
      </div>
    </div>
  );
}
