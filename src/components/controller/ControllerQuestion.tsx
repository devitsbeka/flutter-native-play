import React, { useMemo } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Clock, Check, Loader2, AlertCircle, X, Star } from 'lucide-react';

export const ControllerQuestion: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { 
    questions, currentQuestionIndex, timeRemaining, myAnswer, myScore, 
    submitAnswer, leaveSession, currentRoundSuggesterId, myPlayerId, phase
  } = useTVGame();
  const currentQuestion = questions[currentQuestionIndex];

  // Check if current player is the suggester (they observe, don't answer)
  const isSuggester = myPlayerId && currentRoundSuggesterId && myPlayerId === currentRoundSuggesterId;

  // CRITICAL DEBUG: Log render state to understand what guests are seeing
  console.log('[ControllerQuestion] 🎮 Render state:', {
    phase,
    questionsLength: questions.length,
    currentQuestionIndex,
    currentQuestion: currentQuestion ? currentQuestion.question_text?.substring(0, 30) + '...' : 'NULL',
    hasOptions: currentQuestion?.options?.length || 0,
    isSuggester,
    myPlayerId: myPlayerId ? myPlayerId.substring(0, 8) + '...' : 'NULL',
    currentRoundSuggesterId: currentRoundSuggesterId ? currentRoundSuggesterId.substring(0, 8) + '...' : 'NULL',
    myAnswer,
    timeRemaining,
  });

  // CRITICAL: Suggester sees observer UI - they cannot answer this round
  if (isSuggester) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
        <div className="text-center">
          <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <p className="text-white text-xl font-bold mb-2">{t("extra.tvYourCategory")}</p>
          <p className="text-purple-300 mb-4">{t("extra.tvObservingRound")}</p>
          <div className="bg-white/10 rounded-xl p-4 mb-6">
            <p className="text-white font-semibold text-center text-sm">
              {t("extra.tvQuestionNofM", { n: currentQuestionIndex + 1, m: questions.length })}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Clock className="w-4 h-4 text-purple-300" />
              <span className="text-purple-300">{t("extra.secondsShort", { time: timeRemaining })}</span>
            </div>
          </div>
          <p className="text-purple-300 text-sm">{t("extra.tvWatchOnTV")}</p>
        </div>
      </div>
    );
  }

  // Handle missing question gracefully - show loading/error state instead of blank screen
  if (!currentQuestion || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
        <div className="text-center">
          {questions.length === 0 ? (
            <>
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">{t("extra.gameNotReady")}</p>
              <p className="text-purple-300 text-sm mb-6">{t("extra.questionsNotLoaded")}</p>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">{t("common.loading")}</p>
              <p className="text-purple-300 text-sm mb-6">{t("extra.waitingNextQuestion")}</p>
            </>
          )}
          <ChunkyButton
            variant="secondary"
            onClick={() => {
              leaveSession();
              navigate('/');
            }}
          >
            {t("extra.tvLeaveGame")}
          </ChunkyButton>
        </div>
      </div>
    );
  }

  // Check if this is a True/False question
  const isTrueFalseQuestion = useMemo(() => {
    if (!currentQuestion?.options) return false;
    if (currentQuestion.options.length !== 2) return false;
    
    const answers = currentQuestion.options.map(a => a.toLowerCase());
    return (
      (answers.includes("მართალია") && answers.includes("მცდარია")) ||
      (answers.includes("true") && answers.includes("false"))
    );
  }, [currentQuestion?.options]);

  const handleAnswer = async (answer: string) => {
    if (myAnswer) return;
    try {
      await submitAnswer(answer);
    } catch (err) {
      console.error('[ControllerQuestion] Failed to submit answer:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-purple-300 text-sm">Q{currentQuestionIndex + 1}/{questions.length}</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeRemaining <= 5 ? 'bg-red-500/30' : 'bg-white/10'}`}>
          <Clock className={`w-4 h-4 ${timeRemaining <= 5 ? 'text-red-400' : 'text-purple-300'}`} />
          <span className={`font-bold ${timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`}>{timeRemaining}</span>
        </div>
        <span className="text-purple-300 text-sm">{myScore} pts</span>
      </div>

      <div className="bg-white/10 rounded-xl p-4 mb-4">
        <p className="text-white font-semibold text-center">{currentQuestion.question_text}</p>
      </div>

      {myAnswer ? (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
          <Check className="w-16 h-16 text-green-400 mb-4" />
          <p className="text-white text-xl font-bold">{t("extra.answerSubmitted")}</p>
          <p className="text-purple-300">{t("extra.watchTV")}</p>
        </motion.div>
      ) : isTrueFalseQuestion ? (
        /* True/False Layout - side by side cards */
        <div className="flex gap-3 px-1 pt-2">
          {currentQuestion.options.map((option, index) => {
            const isTrue = option.toLowerCase() === "მართალია" || option.toLowerCase() === "true";
            return (
              <motion.button
                key={index}
                onClick={() => handleAnswer(option)}
                whileTap={{ scale: 0.95 }}
                className="flex-1 relative h-[120px] sm:h-[140px] cursor-pointer"
              >
                {/* Shadow Layer */}
                <div 
                  className="absolute inset-0 rounded-2xl"
                  style={{ 
                    background: isTrue ? '#A5D6A7' : '#EF9A9A', 
                    transform: "translateY(4px)" 
                  }}
                />
                
                {/* Main Face */}
                <div 
                  className="relative flex flex-col items-center justify-center py-5 rounded-2xl gap-2 h-full"
                  style={{ background: isTrue ? '#E8F5E9' : '#FFEBEE' }}
                >
                  {/* Icon Circle */}
                  <div 
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: isTrue ? '#22C55E' : '#EF4444' }}
                  >
                    {isTrue ? (
                      <Check className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={3} />
                    ) : (
                      <X className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={3} />
                    )}
                  </div>
                  
                  {/* Label Text */}
                  <span 
                    className="font-bold text-base sm:text-lg"
                    style={{ color: isTrue ? '#22C55E' : '#EF4444' }}
                  >
                    {isTrue ? t("extra.tvTrue") : t("extra.tvFalse")}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              onClick={() => handleAnswer(option)}
              className="relative w-full rounded-2xl bg-white min-h-[72px] flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform p-3"
              style={{ boxShadow: '0 4px 0 0 #CBD5E1' }}
            >
              <span 
                className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-sm flex-shrink-0 self-start mt-0.5"
                style={{ 
                  background: ['#A855F7', '#7C3AED', '#6366F1', '#8B5CF6'][index] 
                }}
              >
                {['A', 'B', 'C', 'D'][index]}
              </span>
              <span className={`text-gray-800 font-semibold flex-1 line-clamp-2 ${option.length > 30 ? 'text-sm' : 'text-base'}`}>
                {option}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
