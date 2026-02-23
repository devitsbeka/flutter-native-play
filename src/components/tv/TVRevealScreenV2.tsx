import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTVGame } from '@/contexts/TVGameContext';
import { TVLeaderboardPanel } from './TVLeaderboardPanel';
import { QuizAnswerButton } from '@/components/ui/quiz-answer-button';

const GEORGIAN_LABELS = ['ა', 'ბ', 'გ', 'დ'];

export const TVRevealScreenV2: React.FC = () => {
  const { questions, currentQuestionIndex, players } = useTVGame();
  const { t } = useLanguage();
  
  const currentQuestion = questions[currentQuestionIndex];
  const correctAnswer = currentQuestion?.correct_answer;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 overflow-hidden">
      <div className="h-full flex gap-4">
        {/* Main content - Question and answers */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Question */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 mb-4 border border-white/10 flex-shrink-0"
          >
            <h2 className="text-white text-xl font-bold text-center">
              {currentQuestion.question_text}
            </h2>
          </motion.div>

          {/* Options with reveal - Compact 2x2 grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 flex-shrink-0">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = option === correctAnswer;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <QuizAnswerButton
                    state={isCorrect ? 'correct' : 'disabled'}
                    label={GEORGIAN_LABELS[index]}
                    text={option}
                    disabled
                    className="min-h-[64px]"
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Progress info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-center flex-shrink-0"
          >
            <p className="text-purple-300 text-sm">
              {t("extra.tvQuestionNofM", { n: currentQuestionIndex + 1, m: questions.length })}
            </p>
            <p className="text-white/60 text-xs mt-1">{t("extra.tvNextQuestionStarting")}</p>
          </motion.div>
        </div>

        {/* Leaderboard - Full height */}
        <div className="w-80 flex-shrink-0 h-full">
          <TVLeaderboardPanel />
        </div>
      </div>
    </div>
  );
};
