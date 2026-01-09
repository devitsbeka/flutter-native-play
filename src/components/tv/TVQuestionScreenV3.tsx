import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Clock, Users, Check, Trophy } from 'lucide-react';
import { SmartAvatar } from '@/components/shared/SmartAvatar';

const OPTION_COLORS = [
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'A', labelBg: '#A855F7' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'B', labelBg: '#7C3AED' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'C', labelBg: '#6366F1' },
  { bg: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)', label: 'D', labelBg: '#8B5CF6' },
];

export const TVQuestionScreenV3: React.FC = () => {
  const { 
    questions, 
    currentQuestionIndex, 
    timeRemaining, 
    players 
  } = useTVGame();
  
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = players.filter(p => p.hasAnswered).length;
  const totalPlayers = players.length;

  // Sort players by score for leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <p className="text-white text-2xl">Loading question...</p>
      </div>
    );
  }

  const timerPercentage = (timeRemaining / 15) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-6 flex">
      {/* Main Question Area - 2/3 */}
      <div className="flex-1 flex flex-col pr-6" style={{ width: '66%' }}>
        {/* Header - Question Counter & Timer */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-sm">
              <span className="text-2xl font-bold text-white">
                {currentQuestionIndex + 1}
                <span className="text-purple-300">/{questions.length}</span>
              </span>
            </div>

            {/* Answered Counter */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10">
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-white font-bold">{answeredCount}/{totalPlayers}</span>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-3">
            <Clock className={`w-6 h-6 ${timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`} />
            <div className="relative w-48 h-8 rounded-full overflow-hidden bg-white/10">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: timeRemaining <= 5 
                    ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)'
                    : 'linear-gradient(90deg, #A855F7 0%, #7C3AED 100%)',
                }}
                initial={{ width: '100%' }}
                animate={{ width: `${timerPercentage}%` }}
                transition={{ duration: 0.3 }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                {timeRemaining}s
              </span>
            </div>
          </div>
        </div>

        {/* Question Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex items-center justify-center mb-8"
        >
          <div 
            className="w-full max-w-4xl p-8 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <h2 
              className="text-4xl font-bold text-white leading-relaxed"
              style={{ fontFamily: 'var(--font-display, inherit)' }}
            >
              {currentQuestion.question_text}
            </h2>
          </div>
        </motion.div>

        {/* Answer Options - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="relative p-6 rounded-2xl text-left flex items-center gap-4"
              style={{
                background: OPTION_COLORS[index].bg,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
            >
              {/* Option Label Badge */}
              <span 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ background: OPTION_COLORS[index].labelBg }}
              >
                {OPTION_COLORS[index].label}
              </span>
              
              {/* Option Text */}
              <span className="text-2xl font-bold text-white">
                {option}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Leaderboard Panel - 1/3 */}
      <div 
        className="w-80 rounded-3xl p-6 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-white">ლიდერბორდი</h3>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  player.hasAnswered ? 'bg-green-500/20' : 'bg-white/5'
                }`}
              >
                {/* Rank */}
                <div 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-amber-600 text-amber-100' :
                    'bg-white/10 text-white/60'
                  }`}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10">
                    <SmartAvatar
                      avatarUrl={player.avatar_url}
                      fallback={player.nickname?.slice(0, 2)}
                      size="sm"
                    />
                  </div>
                  
                  {/* Answered Indicator */}
                  {player.hasAnswered && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </div>

                {/* Name & Score */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{player.nickname}</p>
                  {!player.hasAnswered && (
                    <motion.p 
                      className="text-purple-300/60 text-xs"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ფიქრობს...
                    </motion.p>
                  )}
                </div>

                {/* Score */}
                <motion.div
                  key={player.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-right"
                >
                  <span className="text-lg font-bold text-white">{player.score}</span>
                  <span className="text-purple-300 text-xs block">ქულა</span>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Waiting indicator */}
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <div className="flex items-center justify-center gap-2 text-purple-300/60">
            <Users className="w-4 h-4" />
            <span className="text-sm">{answeredCount}/{totalPlayers} უპასუხა</span>
          </div>
        </div>
      </div>
    </div>
  );
};
