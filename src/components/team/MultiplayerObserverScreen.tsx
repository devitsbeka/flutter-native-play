import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { cn } from "@/lib/utils";
import { calculateObserverBonus } from "@/utils/tvScoring";
import { supabase } from "@/integrations/supabase/client";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton } from "@/components/ui/quiz-answer-button";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";
import { SafeAvatar } from "@/components/shared/SafeAvatar";

interface MultiplayerObserverScreenProps {
  timeRemaining: number;
  onExit: () => void;
}

const TIME_PER_QUESTION = 15;
const ANSWER_LABELS = ["ა", "ბ", "გ", "დ"];

export function MultiplayerObserverScreen({ onExit }: MultiplayerObserverScreenProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { playSound } = useSound();
  const {
    questions,
    currentQuestionIndex,
    myScore,
    participants,
    awardObserverBonus,
    nextQuestion,
    currentRoom,
    currentOpponentAnswers,
  } = useMultiplayerV2();

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [bonusEarnedThisRound, setBonusEarnedThisRound] = useState(0);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(TIME_PER_QUESTION);
  const processedAnswerIdsRef = useRef<Set<string>>(new Set());

  // Get current question for display
  const currentQuestion = questions[currentQuestionIndex];

  // Get all other players (non-host)
  const players = participants.filter(p => p.user_id !== user?.id);
  
  // Sort participants by score for leaderboard (include host)
  const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Count how many players have answered current question
  const answeredCount = players.filter(p => currentOpponentAnswers[p.user_id]).length;

  // Check if all players answered (to show correct answer)
  const allAnswered = players.length > 0 && players.every(p => currentOpponentAnswers[p.user_id]);

  // Reset timer on question change
  useEffect(() => {
    setLocalTimeRemaining(TIME_PER_QUESTION);
  }, [currentQuestionIndex]);

  // Countdown timer (visual only for observer)
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTimeRemaining(prev => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  // Poll answers and calculate majority-based observer bonus per question
  useEffect(() => {
    const roomId = currentRoom?.id;
    const totalPlayers = players.length;
    if (!roomId || totalPlayers === 0) return;
    
    const pollAnswers = async () => {
      // Fetch ALL answers (correct and incorrect) to count per-question
      const { data: allAnswers } = await supabase
        .from("player_answers")
        .select("user_id, question_index, time_remaining, is_correct")
        .eq("room_id", roomId);
      
      if (!allAnswers || allAnswers.length === 0) return;
      
      // Group answers by question_index
      const byQuestion = new Map<number, typeof allAnswers>();
      for (const answer of allAnswers) {
        const existing = byQuestion.get(answer.question_index) || [];
        existing.push(answer);
        byQuestion.set(answer.question_index, existing);
      }
      
      let newBonus = 0;
      
      for (const [qIndex, answers] of byQuestion.entries()) {
        const qKey = `q-${qIndex}`;
        if (processedAnswerIdsRef.current.has(qKey)) continue;

        // Only process questions where all players have answered
        const uniqueRespondents = new Set(answers.map(a => a.user_id));
        if (uniqueRespondents.size < totalPlayers) continue;

        // Mark BEFORE awarding so an overlapping poll/advance pass can't double-award
        processedAnswerIdsRef.current.add(qKey);

        // Count correct vs incorrect
        const correctCount = answers.filter(a => a.is_correct).length;
        const wrongCount = totalPlayers - correctCount;
        
        // Majority wrong (>50%) → host earns one bonus
        if (wrongCount > totalPlayers / 2) {
          const wrongAnswers = answers.filter(a => !a.is_correct);
          const avgTime = wrongAnswers.length > 0
            ? wrongAnswers.reduce((sum, a) => sum + (a.time_remaining ?? 0), 0) / wrongAnswers.length
            : 0;
          const bonus = calculateObserverBonus(avgTime);
          newBonus += bonus;
        }
      }

      if (newBonus > 0) {
        setBonusEarnedThisRound(prev => prev + newBonus);
        awardObserverBonus(newBonus);
      }
    };

    // Slow reconciliation poll only - primary data arrives via the realtime
    // opponentAnswers map; this just catches inserts the channel missed
    const interval = setInterval(pollAnswers, 10000);
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
      console.log(`[Observer] All players advanced, processing final bonus before advancing from ${currentQuestionIndex}`);
      
      // Fetch and process any unprocessed questions with majority-based scoring BEFORE advancing
      const processFinalBonus = async () => {
        const roomId = currentRoom?.id;
        if (!roomId) {
          playSound("button-click");
          nextQuestion();
          return;
        }
        
        const totalPlayers = otherPlayers.length;
        
        const { data: allAnswers } = await supabase
          .from("player_answers")
          .select("user_id, question_index, time_remaining, is_correct")
          .eq("room_id", roomId);
        
        if (allAnswers && allAnswers.length > 0) {
          // Group by question_index
          const byQuestion = new Map<number, typeof allAnswers>();
          for (const answer of allAnswers) {
            const existing = byQuestion.get(answer.question_index) || [];
            existing.push(answer);
            byQuestion.set(answer.question_index, existing);
          }
          
          let newBonus = 0;
          
          for (const [qIndex, answers] of byQuestion.entries()) {
            const qKey = `q-${qIndex}`;
            if (processedAnswerIdsRef.current.has(qKey)) continue;

            // Mark BEFORE awarding so an overlapping poll pass can't double-award
            processedAnswerIdsRef.current.add(qKey);

            // At final advance, process even if not all players answered (treat missing as wrong)
            const correctCount = answers.filter(a => a.is_correct).length;
            const wrongCount = totalPlayers - correctCount;
            
            if (wrongCount > totalPlayers / 2) {
              const wrongAnswers = answers.filter(a => !a.is_correct);
              const avgTime = wrongAnswers.length > 0
                ? wrongAnswers.reduce((sum, a) => sum + (a.time_remaining ?? 0), 0) / wrongAnswers.length
                : 0;
              const bonus = calculateObserverBonus(avgTime);
              newBonus += bonus;
            }
          }
          
          if (newBonus > 0) {
            setBonusEarnedThisRound(prev => prev + newBonus);
            await awardObserverBonus(newBonus);
          }
        }
        
        playSound("button-click");
        nextQuestion();
      };
      
      processFinalBonus();
    }
  }, [participants, currentQuestionIndex, user?.id, nextQuestion, playSound, currentRoom?.id, awardObserverBonus]);

  // Helper to find players who picked a specific answer
  const getPlayersWhoChoseAnswer = (answer: string) => {
    return Object.entries(currentOpponentAnswers)
      .filter(([_, ans]) => ans.answer === answer)
      .map(([userId]) => participants.find(p => p.user_id === userId))
      .filter(Boolean);
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
                  <ResolvedAvatarImage src={p.avatar_url || undefined} />
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
                      <ResolvedAvatarImage src={p.avatar_url || undefined} />
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

        {/* Main Game Content - Same as player view */}
        <div className="flex-1 flex flex-col px-4 overflow-hidden min-h-0">
          {/* Question Icon - overlapping card */}
          <div className="relative flex-shrink-0 h-10 mt-2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <QuizCategoryIcon
                iconSlug={currentQuestion?.iconSlug}
                categoryId={currentRoom?.category_id || undefined}
                size={72}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="flex-shrink-0 mt-8">
            <QuizQuestionCard
              questionText={currentQuestion?.question || ""}
              progressPercent={(localTimeRemaining / TIME_PER_QUESTION) * 100}
              state="default"
              timerSeconds={Math.ceil(localTimeRemaining)}
              timerMaxSeconds={TIME_PER_QUESTION}
              reserveTopSpace
            />
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center my-3 flex-shrink-0">
            <QuizProgressDots
              total={questions.length}
              current={currentQuestionIndex}
              results={[]}
            />
          </div>

          {/* Answer Buttons with Real-time Player Avatars */}
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto min-h-0 pb-2">
            {currentQuestion?.allAnswers.map((answer, index) => {
              // Find players who chose this answer (show in real-time for observer)
              const playersWhoChoseThis = getPlayersWhoChoseAnswer(answer);
              
              // Determine answer state (show correct after everyone answers)
              const isCorrect = answer === currentQuestion.correctAnswer;
              const answerState = allAnswered && isCorrect ? "correct" : "default";
              
              return (
                <motion.div 
                  key={`${currentQuestionIndex}-${index}`} 
                  className="relative flex-shrink-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <QuizAnswerButton
                    label={ANSWER_LABELS[index]}
                    text={answer}
                    state={answerState}
                    disabled={true}
                    showLabel={true}
                  />
                  
                  {/* Player avatars who picked this answer */}
                  {playersWhoChoseThis.length > 0 && (
                    <motion.div 
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex -space-x-1.5"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      {playersWhoChoseThis.slice(0, 4).map((p) => (
                        <SafeAvatar
                          key={p?.id}
                          avatarUrl={p?.avatar_url}
                          fallback={p?.nickname || "?"}
                          className="w-9 h-9 border-2 border-white shadow-sm"
                          fallbackClassName="text-[10px]"
                        />
                      ))}
                      {playersWhoChoseThis.length > 4 && (
                        <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-[10px] font-bold text-gray-600 border-2 border-white shadow-sm">
                          +{playersWhoChoseThis.length - 4}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Observer Status Bar */}
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <div className="pb-[env(safe-area-inset-bottom)]">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="text-white/80 text-sm">
                  შენი ტრივიაა — აკვირდები ({answeredCount}/{players.length})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{myScore}</span>
                {bonusEarnedThisRound > 0 && (
                  <motion.span
                    key={bonusEarnedThisRound}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-green-400 text-sm font-bold"
                  >
                    +{bonusEarnedThisRound}
                  </motion.span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
