import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { TVLeaderboardPanel } from './TVLeaderboardPanel';
import { Clock, Check } from 'lucide-react';

const OPTION_COLORS = [
  { bg: 'from-red-500 to-red-600', label: 'A' },
  { bg: 'from-blue-500 to-blue-600', label: 'B' },
  { bg: 'from-yellow-500 to-yellow-600', label: 'C' },
  { bg: 'from-green-500 to-green-600', label: 'D' },
];

export const TVQuestionScreenV2: React.FC = () => {
  const { questions, currentQuestionIndex, timeRemaining, players } = useTVGame();
  
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = players.filter(p => p.hasAnswered).length;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading question...</p>
      </div>
    );
  }

  const timerPercentage = (timeRemaining / 15) * 100;
  const isTimeLow = timeRemaining <= 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 overflow-hidden">
      <div className="h-full flex gap-6">
        {/* Main content - Question and answers */}
        <div className="flex-1 flex flex-col">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            {/* Question counter */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur rounded-xl px-4 py-2"
            >
              <span className="text-purple-300 text-sm">Question</span>
              <span className="text-white text-2xl font-bold ml-2">
                {currentQuestionIndex + 1}/{totalQuestions}
              </span>
            </motion.div>

            {/* Timer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative flex items-center gap-3 px-6 py-3 rounded-xl ${isTimeLow ? 'bg-red-500/30' : 'bg-white/10'} backdrop-blur`}
            >
              <Clock className={`w-6 h-6 ${isTimeLow ? 'text-red-400' : 'text-purple-300'}`} />
              <span className={`text-3xl font-bold font-mono ${isTimeLow ? 'text-red-400' : 'text-white'}`}>
                {timeRemaining}
              </span>
              
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-xl overflow-hidden">
                <motion.div
                  className={`h-full ${isTimeLow ? 'bg-red-500' : 'bg-purple-400'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${timerPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>

            {/* Answered count */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2"
            >
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-white font-semibold">
                {answeredCount}/{players.length}
              </span>
              <span className="text-purple-300 text-sm">answered</span>
            </motion.div>
          </div>

          {/* Question */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 mb-6 border border-white/10"
          >
            <h2 className="text-white text-3xl font-bold text-center leading-relaxed">
              {currentQuestion.question_text}
            </h2>
          </motion.div>

          {/* Options - 2x2 grid */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            {currentQuestion.options.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`bg-gradient-to-r ${OPTION_COLORS[index].bg} rounded-2xl p-6 flex items-center gap-4 shadow-lg`}
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                  {OPTION_COLORS[index].label}
                </div>
                <p className="text-white text-xl font-semibold flex-1">
                  {option}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Leaderboard sidebar */}
        <div className="w-80 flex-shrink-0">
          <TVLeaderboardPanel />
        </div>
      </div>
    </div>
  );
};
