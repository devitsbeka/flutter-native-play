import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Check, X, Crown, User, ChevronUp, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type AnswerState = "idle" | "selected" | "revealed";

export function MultiplayerGameScreen() {
  const { user, profile } = useAuth();
  const { playSound, vibrate, startBackgroundMusic, stopBackgroundMusic } = useSound();
  const {
    questions,
    currentQuestionIndex,
    submitAnswer,
    nextQuestion,
    timePerQuestion,
    myScore,
    phase,
    lastAnswerCorrect,
    lastPointsEarned,
    opponentAnswers,
    participants,
  } = useMultiplayer();

  // Start background music when game starts
  useEffect(() => {
    startBackgroundMusic();
    return () => stopBackgroundMusic();
  }, [startBackgroundMusic, stopBackgroundMusic]);

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  
  // Get all other players (opponents)
  const opponents = participants.filter(p => p.user_id !== user?.id);
  
  // Sort participants by score for leaderboard
  const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Sync state with phase changes
  useEffect(() => {
    if (phase === "playing") {
      setAnswerState("idle");
      setSelectedAnswer(null);
      setTimeRemaining(timePerQuestion);
      playSound("game-start");
    } else if (phase === "question-result") {
      setAnswerState("revealed");
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

  // Count how many opponents have answered
  const answeredCount = Object.keys(opponentAnswers).length;

  const progressPercent = isRevealed ? 100 : timerPercentage;

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-[#7E7BDC]">
      {/* Header with avatars and scores */}
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 pt-[calc(env(safe-area-inset-top)+12px)]">
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
        <div className="flex items-center gap-1 bg-white/10 px-4 py-2 rounded-full">
          <span className="text-white font-bold text-lg">{currentQuestionIndex + 1}</span>
          <span className="text-white/60 font-medium">/</span>
          <span className="text-white/60 font-bold text-lg">{questions.length}</span>
        </div>

        {/* Leaderboard toggle / opponent count */}
        <motion.button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex -space-x-2">
            {opponents.slice(0, 3).map((opp, i) => (
              <Avatar key={opp.id} className="w-6 h-6 border border-white/30" style={{ zIndex: 3 - i }}>
                <AvatarImage src={opp.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-500 text-white text-[10px]">
                  {opp.nickname?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {opponents.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white border border-white/30">
                +{opponents.length - 3}
              </div>
            )}
          </div>
          {showLeaderboard ? (
            <ChevronUp className="w-4 h-4 text-white/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/60" />
          )}
        </motion.button>
      </div>

      {/* Leaderboard dropdown */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-2 space-y-1.5">
              {sortedParticipants.map((p, index) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg",
                    p.user_id === user?.id ? "bg-white/10" : ""
                  )}
                >
                  <span className="w-5 text-center text-white/60 text-sm font-bold">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </span>
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="bg-purple-500 text-white text-[10px]">
                      {p.nickname?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-white text-sm truncate">
                    {p.user_id === user?.id ? "შენ" : p.nickname}
                  </span>
                  <span className="text-white font-bold text-sm">{p.score || 0}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answered indicator */}
      {answeredCount > 0 && !isRevealed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mb-2"
        >
          <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-white/10 mx-auto w-fit">
            <span className="text-white/80 text-xs">
              {answeredCount}/{opponents.length} უპასუხა
            </span>
          </div>
        </motion.div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden min-h-0">
        {/* Question card */}
        <div 
          className="rounded-3xl overflow-hidden mb-3 flex-shrink-0"
          style={{
            backgroundColor: "#6B5FA8",
            boxShadow: "0 6px 0 #4A4080",
          }}
        >
          {/* Progress bar */}
          <div className="h-2 bg-white/20 w-full">
            <motion.div
              className={cn(
                "h-full rounded-r-full transition-colors",
                isRevealed ? "bg-green-400" :
                timerPercentage > 50 ? "" : 
                timerPercentage > 25 ? "bg-amber-400" : "bg-red-500"
              )}
              style={{ 
                background: isRevealed ? "#4ADE80" : timerPercentage > 50 ? "linear-gradient(90deg, #F5A623 0%, #F7C948 100%)" : undefined,
                width: `${progressPercent}%` 
              }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Result banner */}
          <div className="min-h-[40px] px-4 pt-2">
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
          <div className="px-5 pb-5">
            <p className="text-white text-lg font-semibold text-center leading-snug">
              {currentQuestion.question}
            </p>
          </div>
        </div>

        {/* Answer buttons */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isThisSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            
            // Find all opponents who chose this answer
            const opponentsWhoChoseThis = isRevealed 
              ? Object.entries(opponentAnswers)
                  .filter(([_, ans]) => ans.answer === answer)
                  .map(([userId, ans]) => ({
                    ...participants.find(p => p.user_id === userId),
                    isCorrect: ans.is_correct,
                  }))
              : [];

            let bgColor = "#FFFFFF";
            let depthColor = "#CBD5E1";
            let textColor = "#2A2550";
            let labelBg = "#7DD3FC";
            let labelText = "#FFFFFF";

            if (answerState !== "idle") {
              if (isRevealed) {
                if (isCorrect) {
                  bgColor = "#4ADE80";
                  depthColor = "#22C55E";
                  textColor = "#FFFFFF";
                  labelBg = "#FFFFFF";
                  labelText = "#22C55E";
                } else if (isThisSelected && !isCorrect) {
                  bgColor = "#EF4444";
                  depthColor = "#DC2626";
                  textColor = "#FFFFFF";
                  labelBg = "#FFFFFF";
                  labelText = "#EF4444";
                }
              } else if (isThisSelected) {
                bgColor = "#7DD3FC";
                depthColor = "#38BDF8";
                textColor = "#FFFFFF";
                labelBg = "#FFFFFF";
                labelText = "#7DD3FC";
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
                className="w-full rounded-2xl text-left font-bold text-base disabled:cursor-not-allowed relative min-h-[56px]"
                style={{ marginBottom: 4 }}
              >
                {/* Depth layer */}
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: depthColor, transform: "translateY(4px)" }}
                />
                
                {/* Main face */}
                <div
                  className="relative flex items-center min-h-[56px] py-3 rounded-2xl"
                  style={{ background: bgColor }}
                >
                  <div
                    className="flex items-center justify-center w-9 h-9 ml-3 rounded-xl font-bold text-base flex-shrink-0"
                    style={{ background: labelBg, color: labelText }}
                  >
                    {isRevealed && isCorrect ? (
                      <Check className="w-5 h-5" />
                    ) : isRevealed && isThisSelected && !isCorrect ? (
                      <X className="w-5 h-5" />
                    ) : (
                      letters[index]
                    )}
                  </div>
                  <span className="flex-1 px-3" style={{ color: textColor }}>
                    {answer}
                  </span>

                  {/* Opponent avatars who chose this answer */}
                  {opponentsWhoChoseThis.length > 0 && (
                    <div className="flex -space-x-1.5 mr-3">
                      {opponentsWhoChoseThis.slice(0, 4).map((opp, i) => (
                        <Avatar 
                          key={opp?.id || i} 
                          className={cn(
                            "w-7 h-7 border-2",
                            opp?.isCorrect ? "border-green-500" : "border-red-500"
                          )}
                        >
                          <AvatarImage src={opp?.avatar_url || undefined} />
                          <AvatarFallback className="bg-purple-500 text-white text-[10px]">
                            {opp?.nickname?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {opponentsWhoChoseThis.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center text-[10px] text-slate-600 border-2 border-slate-300">
                          +{opponentsWhoChoseThis.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Next Button */}
        <div className="mt-3 flex-shrink-0">
          <div className={cn(
            "transition-opacity duration-200",
            isRevealed ? "opacity-100" : "opacity-0 pointer-events-none h-0"
          )}>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNext}
              className="w-full rounded-2xl font-bold text-lg relative"
              style={{ marginBottom: 4 }}
            >
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ background: "#22C55E", transform: "translateY(4px)" }}
              />
              <div
                className="relative flex items-center justify-center min-h-[56px] py-3 rounded-2xl text-white"
                style={{ background: "#4ADE80" }}
              >
                {currentQuestionIndex < questions.length - 1 ? "შემდეგი კითხვა" : "შედეგები"}
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Safe area bottom padding */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
