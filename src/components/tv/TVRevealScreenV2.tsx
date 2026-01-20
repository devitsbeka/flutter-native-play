import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { TVLeaderboardPanel } from './TVLeaderboardPanel';
import { Check, X } from 'lucide-react';
import { QuizAnswerButton } from '@/components/ui/quiz-answer-button';

const GEORGIAN_LABELS = ['ა', 'ბ', 'გ', 'დ'];

export const TVRevealScreenV2: React.FC = () => {
  const { questions, currentQuestionIndex, players } = useTVGame();
  
  const currentQuestion = questions[currentQuestionIndex];
  const correctAnswer = currentQuestion?.correct_answer;
  
  const correctPlayers = players.filter(p => p.lastAnswerCorrect === true);
  const wrongPlayers = players.filter(p => p.lastAnswerCorrect === false);

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
        {/* Main content */}
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

          {/* Results summary - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 flex-1 min-h-0"
          >
            {/* Correct players */}
            <div className="flex-1 bg-green-500/20 rounded-xl p-3 border border-green-500/30 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold text-sm">
                  სწორი ({correctPlayers.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 overflow-y-auto">
                {correctPlayers.map(player => (
                  <span key={player.id} className="bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full text-xs">
                    {player.nickname}
                  </span>
                ))}
              </div>
            </div>

            {/* Wrong players */}
            <div className="flex-1 bg-red-500/20 rounded-xl p-3 border border-red-500/30 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <X className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-semibold text-sm">
                  არასწორი ({wrongPlayers.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 overflow-y-auto">
                {wrongPlayers.map(player => (
                  <span key={player.id} className="bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full text-xs">
                    {player.nickname}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-center flex-shrink-0"
          >
            <p className="text-purple-300 text-sm">შემდეგი კითხვა იწყება...</p>
          </motion.div>
        </div>

        {/* Leaderboard - Fixed width */}
        <div className="w-72 flex-shrink-0 max-h-full">
          <TVLeaderboardPanel />
        </div>
      </div>
    </div>
  );
};
