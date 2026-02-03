import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { cn } from "@/lib/utils";
import { calculateObserverBonus } from "@/utils/tvScoring";
import { supabase } from "@/integrations/supabase/client";

interface MultiplayerObserverScreenProps {
  timeRemaining: number;
  onExit: () => void;
}

const TIME_PER_QUESTION = 15;

export function MultiplayerObserverScreen({ onExit }: MultiplayerObserverScreenProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { playSound, vibrate } = useSound();
  const {
    questions,
    currentQuestionIndex,
    myScore,
    observerBonusThisRound,
    participants,
    awardObserverBonus,
    nextQuestion,
    currentRoom,
    opponentAnswers,
  } = useMultiplayerV2();

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [bonusEarnedThisRound, setBonusEarnedThisRound] = useState(0);
  const processedAnswerIdsRef = useRef<Set<string>>(new Set());

  // Get current question for display
  const currentQuestion = questions[currentQuestionIndex];

  // Get all other players (non-host)
  const players = participants.filter(p => p.user_id !== user?.id);
  
  // Sort participants by score for leaderboard (include host)
  const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Count how many players have answered current question
  const answeredCount = players.filter(p => opponentAnswers[p.user_id]).length;

  // Poll for ALL incorrect answers across ALL questions (catches skipped ones)
  useEffect(() => {
    const roomId = currentRoom?.id;
    if (!roomId || players.length === 0) return;
    
    const pollAnswers = async () => {
      const { data: allAnswers } = await supabase
        .from("player_answers")
        .select("user_id, question_index, time_remaining, is_correct")
        .eq("room_id", roomId)
        .eq("is_correct", false);
      
      if (!allAnswers || allAnswers.length === 0) return;
      
      let newBonus = 0;
      
      for (const answer of allAnswers) {
        const answerId = `${answer.user_id}-${answer.question_index}`;
        if (processedAnswerIdsRef.current.has(answerId)) continue;
        
        const timeRemaining = answer.time_remaining ?? 0;
        const bonus = calculateObserverBonus(timeRemaining);
        newBonus += bonus;
        processedAnswerIdsRef.current.add(answerId);
      }
      
      if (newBonus > 0) {
        setBonusEarnedThisRound(prev => prev + newBonus);
        awardObserverBonus(newBonus);
      }
    };
    
    // Poll every 2 seconds
    const interval = setInterval(pollAnswers, 2000);
    pollAnswers(); // Initial poll
    
    return () => clearInterval(interval);
  }, [currentRoom?.id, players.length, awardObserverBonus]);

  // Auto-advance observer when ALL players have moved to next question
  useEffect(() => {
    const otherPlayers = participants.filter(p => p.user_id !== user?.id);
    if (otherPlayers.length === 0) return;
    
    // Check if all players have advanced past current question
    const allPlayersAdvanced = otherPlayers.every(
      p => (p.current_question || 0) > currentQuestionIndex
    );
    
    if (allPlayersAdvanced) {
      console.log(`[Observer] All players at question ${otherPlayers[0].current_question}, auto-advancing from ${currentQuestionIndex}`);
      playSound("button-click");
      nextQuestion();
    }
  }, [participants, currentQuestionIndex, user?.id, nextQuestion, playSound]);

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
        <div className="flex-1 flex flex-col items-center px-4 pt-4 overflow-y-auto">
          {/* Compact Header with Star */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="mb-3"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-bold text-white mb-1"
          >
            შენი ტრივიაა!
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/70 text-sm mb-4 text-center"
          >
            ამიტომ ამ რაუნდში აკვირდები • გადახტი შემდეგზე ნებისმიერ დროს
          </motion.p>

          {/* Current Question Display */}
          {currentQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 w-full max-w-sm mb-4"
            >
              <p className="text-white/50 text-xs mb-1 text-center">მიმდინარე კითხვა</p>
              <p className="text-white font-medium text-center text-sm leading-snug">
                {currentQuestion.question}
              </p>
            </motion.div>
          )}

          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 w-full max-w-xs"
          >
            <p className="text-white/60 text-sm mb-1">შენი ქულა</p>
            <motion.p
              key={myScore}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold text-white mb-2"
            >
              {myScore}
            </motion.p>
            <p className="text-amber-300 text-sm font-medium">
              იღებ ქულებს შეცდომებზე 💡
            </p>
            {bonusEarnedThisRound > 0 && (
              <motion.p
                key={bonusEarnedThisRound}
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-green-300 text-sm mt-2 font-bold"
              >
                +{bonusEarnedThisRound} ბონუსი! 🎉
              </motion.p>
            )}
          </motion.div>

        </div>

        {/* Bottom Area - Status Indicator (no button for observer) */}
        <div className="px-4 pb-6 pt-4 flex-shrink-0">
          <div className="pb-[env(safe-area-inset-bottom)]">
            <div className="bg-white/10 rounded-2xl py-4 px-6 text-center">
              <p className="text-white/70 text-sm">
                {players.length > 0 
                  ? `მოთამაშეები პასუხობენ... (${answeredCount}/${players.length})`
                  : "ველოდები მოთამაშეებს..."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}