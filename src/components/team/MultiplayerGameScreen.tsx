import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Check, X, Crown, Clock, User } from "lucide-react";

type AnswerState = "idle" | "selected" | "revealed";

export function MultiplayerGameScreen() {
  const { user, profile } = useAuth();
  const { playSound, vibrate } = useSound();
  const {
    questions,
    currentQuestionIndex,
    submitAnswer,
    nextQuestion,
    timePerQuestion,
    myScore,
    opponentScore,
    phase,
    lastAnswerCorrect,
    lastPointsEarned,
    opponentAnswer,
    participants,
  } = useMultiplayer();

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");

  const currentQuestion = questions[currentQuestionIndex];
  const opponent = participants.find(p => p.user_id !== user?.id);

  // Sync state with phase changes
  useEffect(() => {
    if (phase === "playing") {
      setAnswerState("idle");
      setSelectedAnswer(null);
      setTimeRemaining(timePerQuestion);
      playSound("game-start");
    } else if (phase === "question-result") {
      setAnswerState("revealed");
      // Play sound based on answer correctness
      if (lastAnswerCorrect) {
        playSound("correct-answer");
        vibrate(50);
      } else {
        playSound("wrong-answer");
        vibrate([50, 50, 50]);
      }
    }
  }, [phase, timePerQuestion, lastAnswerCorrect, playSound, vibrate]);

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
    submitAnswer(answer, timeRemaining);
  }, [answerState, submitAnswer, timeRemaining]);

  const handleNext = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  // Timer
  useEffect(() => {
    if (answerState !== "idle" || phase !== "playing") return;

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
  }, [answerState, handleAnswer, phase]);

  if (!currentQuestion) return null;

  const timerPercentage = (timeRemaining / timePerQuestion) * 100;
  const isRevealed = answerState === "revealed";
  const letters = ["A", "B", "C", "D"];

  // Get flag emoji
  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
      {/* Header with avatars and scores */}
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
        {/* Player */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#5B4BC4] border-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
            <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-white font-bold text-sm">{myScore}</span>
          </div>
        </div>

        {/* Question counter */}
        <div className="text-white/80 text-sm font-medium">
          {currentQuestionIndex + 1}/{questions.length}
        </div>

        {/* Opponent */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
            <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-white font-bold text-sm">{opponentScore}</span>
          </div>
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#5B4BC4] border-2 border-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.5)]">
              {opponent?.avatar_url ? (
                <img src={opponent.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            {/* Opponent answered indicator */}
            {opponentAnswer && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                  opponentAnswer.is_correct ? "bg-green-500" : "bg-red-500"
                )}
              >
                {opponentAnswer.is_correct ? (
                  <Check className="w-3 h-3 text-white" />
                ) : (
                  <X className="w-3 h-3 text-white" />
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden min-h-0">
        {/* Question card */}
        <div className="bg-[#5B4BC4] rounded-3xl p-4 mb-3 flex-shrink-0 relative">
          {/* Timer progress */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
            <motion.div
              className={cn(
                "h-full rounded-full transition-colors",
                isRevealed ? "bg-green-400" :
                timerPercentage > 50 ? "bg-white" : 
                timerPercentage > 25 ? "bg-amber-400" : "bg-red-500"
              )}
              style={{ width: isRevealed ? "100%" : `${timerPercentage}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Result banner */}
          <div className="h-10 mb-2">
            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "py-1.5 px-3 rounded-xl flex items-center justify-center gap-2",
                    lastAnswerCorrect ? "bg-green-500/20" : "bg-red-500/20"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    lastAnswerCorrect ? "bg-green-500" : "bg-red-500"
                  )}>
                    {lastAnswerCorrect ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-white font-bold text-sm">
                    {lastAnswerCorrect ? `+${lastPointsEarned} ქულა!` : "არასწორია!"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Question text */}
          <p className="text-white text-xl font-bold text-center leading-snug">
            {currentQuestion.question}
          </p>
        </div>

        {/* Answer buttons */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isThisSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            const isOpponentAnswer = isRevealed && opponentAnswer?.answer === answer;

            let buttonBg = "bg-white";
            let letterBg = "bg-[#7DD3FC]";
            let letterText = "text-white";
            let answerText = "text-[#2A2550]";
            let shadow = "shadow-[0_4px_0_0_#CBD5E1]";

            if (answerState !== "idle") {
              if (isRevealed) {
                if (isCorrect) {
                  buttonBg = "bg-green-500";
                  letterBg = "bg-white";
                  letterText = "text-green-500";
                  answerText = "text-white";
                  shadow = "shadow-[0_4px_0_0_#16A34A]";
                } else if (isThisSelected && !isCorrect) {
                  buttonBg = "bg-red-500";
                  letterBg = "bg-white";
                  letterText = "text-red-500";
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
                key={`${currentQuestionIndex}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleAnswer(answer)}
                disabled={answerState !== "idle"}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl text-left relative",
                  "disabled:cursor-not-allowed min-h-[56px]",
                  buttonBg,
                  shadow
                )}
              >
                <span className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0",
                  letterBg,
                  letterText
                )}>
                  {isRevealed && isCorrect ? (
                    <Check className="w-5 h-5" />
                  ) : isRevealed && isThisSelected && !isCorrect ? (
                    <X className="w-5 h-5" />
                  ) : (
                    letters[index]
                  )}
                </span>
                <span className={cn("flex-1 font-bold text-base", answerText)}>
                  {answer}
                </span>

                {/* Opponent answer indicator */}
                {isOpponentAnswer && (
                  <div className="flex items-center gap-1">
                    <div className={cn(
                      "w-7 h-7 rounded-full overflow-hidden border-2",
                      opponentAnswer.is_correct ? "border-green-500" : "border-red-500"
                    )}>
                      {opponent?.avatar_url ? (
                        <img src={opponent.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-purple-500 flex items-center justify-center">
                          <User className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Next Button */}
        <div className="mt-3 flex-shrink-0 h-14">
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
