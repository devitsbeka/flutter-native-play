import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { TVLeaderboardPanel } from './TVLeaderboardPanel';
import { Check, X } from 'lucide-react';

const OPTION_COLORS = [
  { bg: 'from-red-500 to-red-600', dimmed: 'from-red-900/50 to-red-900/30', label: 'A' },
  { bg: 'from-blue-500 to-blue-600', dimmed: 'from-blue-900/50 to-blue-900/30', label: 'B' },
  { bg: 'from-yellow-500 to-yellow-600', dimmed: 'from-yellow-900/50 to-yellow-900/30', label: 'C' },
  { bg: 'from-green-500 to-green-600', dimmed: 'from-green-900/50 to-green-900/30', label: 'D' },
];

export const TVRevealScreenV2: React.FC = () => {
  const { questions, currentQuestionIndex, players, isHost, startNextRound } = useTVGame();
  const [showNextButton, setShowNextButton] = useState(false);
  
  const currentQuestion = questions[currentQuestionIndex];
  const correctAnswer = currentQuestion?.correct_answer;
  
  const correctPlayers = players.filter(p => p.lastAnswerCorrect === true);
  const wrongPlayers = players.filter(p => p.lastAnswerCorrect === false);

  // Auto-advance after 5 seconds (host only)
  useEffect(() => {
    setShowNextButton(true);
    
    if (isHost) {
      const timer = setTimeout(() => {
        startNextRound();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isHost, startNextRound]);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 overflow-hidden">
      <div className="h-full flex gap-6">
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Question */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10"
          >
            <h2 className="text-white text-2xl font-bold text-center">
              {currentQuestion.question_text}
            </h2>
          </motion.div>

          {/* Options with reveal */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = option === correctAnswer;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={`relative rounded-2xl p-5 flex items-center gap-4 shadow-lg overflow-hidden ${
                    isCorrect 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 ring-4 ring-green-400/50' 
                      : `bg-gradient-to-r ${OPTION_COLORS[index].dimmed} opacity-60`
                  }`}
                >
                  {/* Correct indicator */}
                  {isCorrect && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center"
                    >
                      <Check className="w-5 h-5 text-green-600" />
                    </motion.div>
                  )}

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold ${
                    isCorrect ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    {OPTION_COLORS[index].label}
                  </div>
                  <p className={`text-lg font-semibold flex-1 ${isCorrect ? 'text-white' : 'text-white/60'}`}>
                    {option}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Results summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-4"
          >
            {/* Correct players */}
            <div className="flex-1 bg-green-500/20 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">
                  Correct ({correctPlayers.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {correctPlayers.map(player => (
                  <span key={player.id} className="bg-green-500/30 text-green-300 px-3 py-1 rounded-full text-sm">
                    {player.nickname}
                  </span>
                ))}
              </div>
            </div>

            {/* Wrong players */}
            <div className="flex-1 bg-red-500/20 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center gap-2 mb-3">
                <X className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-semibold">
                  Incorrect ({wrongPlayers.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {wrongPlayers.map(player => (
                  <span key={player.id} className="bg-red-500/30 text-red-300 px-3 py-1 rounded-full text-sm">
                    {player.nickname}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Next question indicator */}
          {showNextButton && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center"
            >
              <p className="text-purple-300">
                {currentQuestionIndex + 1 < questions.length 
                  ? 'Next question coming...'
                  : 'Final results coming...'}
              </p>
            </motion.div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="w-80 flex-shrink-0">
          <TVLeaderboardPanel />
        </div>
      </div>
    </div>
  );
};
