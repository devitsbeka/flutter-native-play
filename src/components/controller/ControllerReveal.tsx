import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Check, X, Loader2, Star, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const ControllerReveal: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { questions, currentQuestionIndex, myAnswer, myScore, players, myPlayerId, leaveSession, phase, currentRoundSuggesterId } = useTVGame();
  
  const isSuggester = myPlayerId && currentRoundSuggesterId && myPlayerId === currentRoundSuggesterId;
  
  const capturedAnswerRef = useRef<{ answer: string | null; questionIndex: number; isCorrect: boolean | null } | null>(null);
  
  const currentQuestion = questions[currentQuestionIndex];
  
  useEffect(() => {
    if (phase === 'reveal' && currentQuestion) {
      if (myAnswer !== null || !capturedAnswerRef.current || capturedAnswerRef.current.questionIndex !== currentQuestionIndex) {
        const isCorrect = myAnswer !== null ? myAnswer === currentQuestion.correct_answer : null;
        capturedAnswerRef.current = {
          answer: myAnswer,
          questionIndex: currentQuestionIndex,
          isCorrect,
        };
        console.log('[ControllerReveal] Captured answer state:', {
          answer: myAnswer?.slice(0, 20),
          questionIndex: currentQuestionIndex,
          isCorrect,
        });
      }
    }
  }, [phase, currentQuestion, myAnswer, currentQuestionIndex]);
  
  useEffect(() => {
    if (phase !== 'reveal') {
      capturedAnswerRef.current = null;
    }
  }, [phase]);

  if (!currentQuestion || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold mb-2">{t("extra.crResultsLoading")}</p>
          <p className="text-purple-300 text-sm mb-2">{t("extra.crWaitNextQuestion")}</p>
        <div className="bg-white/10 rounded-xl px-6 py-3 mt-4 mb-4">
          <span className="text-purple-300">{t("extra.crYourScore")}</span>
          <span className="text-white text-2xl font-bold">{Math.round(myScore)}</span>
        </div>
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={() => {
              leaveSession();
              navigate('/');
            }}
          >
            {t("extra.crLeaveGame")}
          </ChunkyButton>
        </div>
      </div>
    );
  }

  if (isSuggester && currentQuestion) {
    const observerPlayer = players.find(p => p.id === myPlayerId);
    const observerScore = observerPlayer?.score ?? myScore;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <Star className="w-16 h-16 text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">{t("extra.crYourCategory")}</h2>
        <p className="text-purple-300 mb-4">{t("extra.crObservingRound")}</p>

        <div className="bg-white/10 rounded-xl p-4 mb-4 max-w-sm">
          <p className="text-purple-300 text-sm mb-1">{t("extra.crCorrectAnswer")}</p>
          <p className="text-white font-semibold text-center">{currentQuestion.correct_answer}</p>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl px-6 py-3 mb-4">
          <span className="text-yellow-300">{t("extra.crYourScore")}</span>
          <span className="text-white text-2xl font-bold">{Math.round(observerScore)}</span>
        </div>

        <p className="text-purple-300/60">{t("extra.crNextQuestionSoon")}</p>
      </div>
    );
  }

  const captured = capturedAnswerRef.current;
  const didAnswer = myAnswer !== null || (captured?.questionIndex === currentQuestionIndex && captured?.answer !== null);
  const isCorrect = captured?.questionIndex === currentQuestionIndex && captured?.isCorrect !== null
    ? captured.isCorrect
    : myAnswer === currentQuestion.correct_answer;
  
  if (myAnswer === null && (!captured || captured.questionIndex !== currentQuestionIndex)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-300 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold mb-2">{t("extra.crChecking")}</p>
          <div className="bg-white/10 rounded-xl px-6 py-3 mt-4">
            <span className="text-purple-300">{t("extra.crYourScore")}</span>
            <span className="text-white text-2xl font-bold">{Math.round(myScore)}</span>
          </div>
        </div>
      </div>
    );
  }

  const iconBg = didAnswer ? (isCorrect ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-500';
  const textColor = didAnswer ? (isCorrect ? 'text-green-400' : 'text-red-400') : 'text-gray-400';
  const message = didAnswer ? (isCorrect ? t("extra.crCorrect") : t("extra.crIncorrect")) : t("extra.crTimeExpired");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${iconBg}`}>
        {didAnswer ? (isCorrect ? <Check className="w-12 h-12 text-white" /> : <X className="w-12 h-12 text-white" />) : <Clock className="w-12 h-12 text-white" />}
      </motion.div>
      
      <h2 className={`text-3xl font-bold mb-2 ${textColor}`}>
        {message}
      </h2>
      
      {!isCorrect && currentQuestion && (
        <p className="text-purple-300 text-center mb-4">
          {t("extra.crAnswer")}{currentQuestion.correct_answer}
        </p>
      )}
      
      <div className="bg-white/10 rounded-xl px-6 py-3 mb-4">
        <span className="text-purple-300">{t("extra.crYourScore")}</span>
        <span className="text-white text-2xl font-bold">{Math.round(myScore)}</span>
      </div>
      
      <p className="text-purple-300/60">{t("extra.crNextQuestionSoon")}</p>
    </div>
  );
};
