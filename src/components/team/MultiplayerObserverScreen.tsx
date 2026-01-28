import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMultiplayerV2, RoomParticipant } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface MultiplayerObserverScreenProps {
  timeRemaining: number;
  onExit: () => void;
}

export function MultiplayerObserverScreen({ timeRemaining, onExit }: MultiplayerObserverScreenProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { playSound, vibrate } = useSound();
  const {
    questions,
    currentQuestionIndex,
    myScore,
    observerBonusThisRound,
    participants,
    opponentAnswers,
    awardObserverBonus,
    nextQuestion,
    currentRoom,
  } = useMultiplayerV2();

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastProcessedQuestion, setLastProcessedQuestion] = useState(-1);
  const [canAdvance, setCanAdvance] = useState(false);
  const [bonusEarnedThisQuestion, setBonusEarnedThisQuestion] = useState(0);

  // Get all other players (non-host)
  const players = participants.filter(p => p.user_id !== user?.id);
  
  // Sort participants by score for leaderboard (include host)
  const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Count answered players
  const answeredCount = Object.keys(opponentAnswers).length;
  
  // Check if this is the last question
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Award bonus points when all players have answered OR timer expired
  useEffect(() => {
    // Only process if we haven't already processed this question
    if (lastProcessedQuestion >= currentQuestionIndex) return;
    
    const allAnswered = players.length > 0 && answeredCount === players.length;
    const timerExpired = timeRemaining <= 0;
    
    // Check if all players have answered or timer ran out
    if (allAnswered || timerExpired) {
      // Count incorrect answers (and players who didn't answer = incorrect)
      const incorrectAnswerCount = Object.values(opponentAnswers).filter(ans => !ans.is_correct).length;
      const didNotAnswerCount = players.length - answeredCount;
      const totalIncorrect = incorrectAnswerCount + didNotAnswerCount;
      const totalPlayers = players.length;
      
      if (totalIncorrect > 0) {
        // Fair scoring based on player count:
        // Small games (1-2 players): 100 per incorrect
        // Larger games (3+): 100 only if 50%+ got it wrong
        let bonus = 0;
        if (totalPlayers <= 2) {
          bonus = totalIncorrect * 100;
        } else if (totalIncorrect / totalPlayers >= 0.5) {
          bonus = 100; // Fixed bonus for majority wrong
        }
        
        if (bonus > 0) {
          setBonusEarnedThisQuestion(bonus);
          awardObserverBonus(bonus);
        }
      }
      
      // Mark this question as processed and allow advancing
      setLastProcessedQuestion(currentQuestionIndex);
      setCanAdvance(true);
    }
  }, [answeredCount, players.length, opponentAnswers, currentQuestionIndex, lastProcessedQuestion, awardObserverBonus, timeRemaining]);

  // Reset when question changes
  useEffect(() => {
    setCanAdvance(false);
    setBonusEarnedThisQuestion(0);
    // Reset lastProcessedQuestion if we're on a new question that hasn't been processed
    if (currentQuestionIndex > lastProcessedQuestion) {
      // Allow the new question to be processed
    } else if (currentQuestionIndex < lastProcessedQuestion) {
      setLastProcessedQuestion(-1);
    }
  }, [currentQuestionIndex, lastProcessedQuestion]);

  const handleNextQuestion = () => {
    playSound("button-click");
    vibrate(30);
    nextQuestion();
  };

  return (
    <div className="w-full h-[100dvh] bg-[#7E7BDC] overflow-hidden">
      <div className="w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">
        {/* Safe area padding */}
        <div className="pt-[env(safe-area-inset-top)]" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <button
            onClick={onExit}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          {/* Question counter */}
          <div className="flex items-center gap-1 bg-white/10 px-4 py-2 rounded-full">
            <span className="text-white font-bold text-lg">{currentQuestionIndex + 1}</span>
            <span className="text-white/60 font-medium">/</span>
            <span className="text-white/60 font-bold text-lg">{questions.length}</span>
          </div>

          {/* Leaderboard toggle */}
          <motion.button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10"
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex -space-x-2">
              {players.slice(0, 3).map((p, i) => (
                <Avatar key={p.id} className="w-6 h-6 border border-white/30" style={{ zIndex: 3 - i }}>
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-500 text-white text-[10px]">
                    {p.nickname?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
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
                      {p.user_id === user?.id ? t("game.you") : p.nickname}
                    </span>
                    <span className="text-white font-bold text-sm">{p.score || 0}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Observer Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          {/* Star Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
              <Star className="w-12 h-12 text-white fill-white" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white mb-2"
          >
            შენი ტრივიაა!
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/70 text-lg mb-8"
          >
            ამიტომ ამ რაუნდში აკვირდები
          </motion.p>

          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 w-full max-w-xs"
          >
            <p className="text-white/60 text-sm mb-1">შენი ქულა</p>
            <motion.p
              key={myScore}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-5xl font-bold text-white mb-2"
            >
              {myScore}
            </motion.p>
            <p className="text-amber-300 text-sm font-medium">
              იღებ ქულებს შეცდომებზე 💡
            </p>
            {bonusEarnedThisQuestion > 0 && canAdvance && (
              <motion.p
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-green-300 text-sm mt-2 font-bold"
              >
                +{bonusEarnedThisQuestion} ამ კითხვაზე! 🎉
              </motion.p>
            )}
            {observerBonusThisRound > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/60 text-xs mt-1"
              >
                სულ ბონუსი: +{observerBonusThisRound}
              </motion.p>
            )}
          </motion.div>

          {/* Players Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-white/10">
              <span className="text-white/80 text-sm">
                {answeredCount}/{players.length} უპასუხეს
              </span>
            </div>
          </motion.div>

          {/* Timer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 flex items-center gap-2 text-white/60"
          >
            <span className="text-2xl">⏱️</span>
            <span className="text-2xl font-bold text-white">{Math.ceil(timeRemaining)}წ</span>
          </motion.div>
        </div>

        {/* Bottom Area - Next Button */}
        <div className="px-4 pb-6 pt-4 flex-shrink-0">
          <div className="pb-[env(safe-area-inset-bottom)]">
            <AnimatePresence mode="wait">
              {canAdvance && (
                <motion.div
                  key="next-button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ChunkyButton
                    variant="secondary"
                    size="xl"
                    onClick={handleNextQuestion}
                    className="w-full"
                  >
                    {isLastQuestion ? t("game.viewResults") : t("game.nextQuestion")}
                  </ChunkyButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}